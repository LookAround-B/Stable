const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const prisma = new PrismaClient();

const MAX_BYTES = 150 * 1024; // 150 KB target

// Compress image to ≤ 150 KB and return as base64 data URI
async function compressToBase64(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const isWebp = ext === '.webp';

  // Start at quality 85 and step down until under 150 KB
  for (let quality = 85; quality >= 20; quality -= 10) {
    let buf;
    if (isWebp) {
      buf = await sharp(filePath)
        .resize({ width: 400, height: 400, fit: 'cover', position: 'centre' })
        .webp({ quality })
        .toBuffer();
    } else {
      buf = await sharp(filePath)
        .resize({ width: 400, height: 400, fit: 'cover', position: 'centre' })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    }
    if (buf.length <= MAX_BYTES) {
      const mime = isWebp ? 'image/webp' : 'image/jpeg';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  }

  // Last resort: quality 15
  const buf = await sharp(filePath)
    .resize({ width: 300, height: 300, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 15, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

// Normalize a name for comparison: lowercase, remove special chars, collapse spaces
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Score how well a filename matches a DB employee name/email
function matchScore(searchName, dbName, dbEmail) {
  const a = normalize(searchName);
  const b = normalize(dbName);
  const email = dbEmail.toLowerCase();
  
  // Exact match
  if (a === b) return 100;
  
  // Email contains the search name (like tclakshman69@gmail.com)
  if (email.includes(a.replace(/\s/g, '').replace(/@.*/, ''))) return 90;
  if (a.includes('@') && email === a) return 95;
  
  // One contains the other
  if (b.includes(a)) return 80;
  if (a.includes(b)) return 75;
  
  // Check without spaces (e.g., "Ashokmb" vs "Ashok.M.B." → "ashokmb" vs "ashokmb")
  const aNoSpace = a.replace(/\s/g, '');
  const bNoSpace = b.replace(/\s/g, '');
  if (aNoSpace === bNoSpace) return 85;
  if (bNoSpace.includes(aNoSpace)) return 70;
  if (aNoSpace.includes(bNoSpace)) return 65;
  
  // Split into words and count matches
  const aWords = a.split(' ').filter(w => w.length > 1);
  const bWords = b.split(' ').filter(w => w.length > 1);
  
  let wordMatches = 0;
  for (const aw of aWords) {
    for (const bw of bWords) {
      if (aw === bw) wordMatches += 10;
      else if (bw.startsWith(aw) || aw.startsWith(bw)) wordMatches += 7;
      else if (bw.includes(aw) || aw.includes(bw)) wordMatches += 5;
    }
  }
  
  // Also check if first word of search matches start of email
  if (aWords.length > 0 && email.startsWith(aWords[0])) wordMatches += 8;
  
  return Math.min(wordMatches, 60); // Cap partial matches at 60
}

async function seedDPFromLocal() {
  console.log('\n🖼️  Seeding profile pictures (compressed to ≤150KB, stored in DB)...\n');

  const dpFolderPath = path.join(__dirname, '..', 'dp-images');

  if (!fs.existsSync(dpFolderPath)) {
    console.error(`❌ Error: "${dpFolderPath}" folder not found!`);
    process.exit(1);
  }

  const files = fs.readdirSync(dpFolderPath).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  });

  if (files.length === 0) {
    console.error(`❌ No image files found in "${dpFolderPath}"`);
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} image files\n`);

  // Load ALL employees from database
  const allEmployees = await prisma.employee.findMany({
    select: { id: true, fullName: true, email: true },
  });
  console.log(`👥 Loaded ${allEmployees.length} employees from database\n`);

  let updated = 0;
  let errors = 0;
  const skipped = [];

  for (const file of files) {
    const filePath = path.join(dpFolderPath, file);
    const nameWithoutExt = path.parse(file).name;
    
    let fileName = nameWithoutExt;
    const dashIndex = nameWithoutExt.lastIndexOf(' - ');
    if (dashIndex !== -1) {
      fileName = nameWithoutExt.substring(dashIndex + 3).trim();
    }

    // Score all employees and find best match
    let bestMatch = null;
    let bestScore = 0;

    for (const emp of allEmployees) {
      const score = matchScore(fileName, emp.fullName, emp.email);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = emp;
      }
    }

    // Require minimum score of 10 to match
    if (!bestMatch || bestScore < 10) {
      console.log(`\n❌ "${fileName}" → No match found`);
      skipped.push({ fileName, reason: 'No match' });
      errors++;
      continue;
    }

    console.log(`\n✔ "${fileName}" → ${bestMatch.fullName} (${bestMatch.email}) [score: ${bestScore}]`);

    try {
      const profileImage = await compressToBase64(filePath);
      const sizeKB = Math.round(Buffer.byteLength(profileImage, 'utf8') / 1024);
      console.log(`  ✓ Compressed to ~${sizeKB}KB, saving to DB...`);

      await prisma.employee.update({
        where: { id: bestMatch.id },
        data: { profileImage },
      });
      console.log(`  ✓ Updated: ${bestMatch.fullName} (${bestMatch.email})`);
      updated++;
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err.message);
      skipped.push({ fileName, reason: err.message });
      errors++;
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Done!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors/Skipped: ${errors}`);
  console.log(`========================================`);

  if (skipped.length > 0) {
    console.log(`\n⚠ Skipped files:`);
    for (const s of skipped) {
      console.log(`   - "${s.fileName}" → ${s.reason}`);
    }
  }
  console.log('');
}

seedDPFromLocal()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
