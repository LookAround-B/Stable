const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

// Initialize R2 client
let r2Client = null;
if (process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// Upload file from local folder to R2
async function uploadImageToR2(filePath, employeeName) {
  try {
    if (!r2Client) return null;

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1) || 'jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const key = `profiles/employees/${uniqueName}`;

    console.log(`  ↑ Uploading ${path.basename(filePath)} to R2...`);
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET || 'horsestable-storage',
        Key: key,
        Body: fileBuffer,
        ContentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`  ✓ Uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`  ✗ Failed to upload image for ${employeeName}:`, err.message);
    return null;
  }
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
  console.log('\n🖼️  Seeding profile pictures from local dp-images folder...\n');

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

  if (!r2Client) {
    console.log('⚠ R2 Storage not configured\n');
    process.exit(1);
  }

  console.log('📦 R2 Storage configured\n');

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
      const profileImage = await uploadImageToR2(filePath, bestMatch.fullName);

      if (profileImage) {
        await prisma.employee.update({
          where: { id: bestMatch.id },
          data: { profileImage },
        });
        console.log(`  ✓ Updated: ${bestMatch.fullName} (${bestMatch.email})`);
        updated++;
      } else {
        skipped.push({ fileName, reason: 'Upload failed' });
        errors++;
      }
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
