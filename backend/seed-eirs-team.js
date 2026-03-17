const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');
const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();

// Initialize R2 client if configured
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

// Map Excel roles to system designations and departments
const ROLE_MAP = {
  'Rider': { designation: 'Rider', department: 'Stable Operations' },
  'Instructor': { designation: 'Instructor', department: 'Stable Operations' },
  'Ground Supervisor/ Property Manager': { designation: 'Ground Supervisor', department: 'Ground Operations' },
  'Driver': { designation: 'Driver', department: 'Ground Operations' },
  'Guard': { designation: 'Guard', department: 'Ground Operations' },
  'Executive Accounts': { designation: 'Executive Accounts', department: 'Accounts/Administration' },
  'Junior Admin': { designation: 'Executive Admin', department: 'Accounts/Administration' },
  'Restaurant Manager': { designation: 'Restaurant Manager', department: 'Restaurant Operations' },
  'House Keeping': { designation: 'Housekeeping', department: 'Ground Operations' },
  'Kitchen Helper-1': { designation: 'Kitchen Helper', department: 'Restaurant Operations' },
  'Kitchen Helper-2': { designation: 'Kitchen Helper', department: 'Restaurant Operations' },
  'Waiter-1': { designation: 'Waiter', department: 'Restaurant Operations' },
  'Chef': { designation: 'Chef', department: 'Restaurant Operations' },
  'Gardener': { designation: 'Gardener', department: 'Ground Operations' },
  'Jamedar': { designation: 'Jamedar', department: 'Stable Operations' },
  'Groom': { designation: 'Groom', department: 'Stable Operations' },
  'Farrier': { designation: 'Farrier', department: 'Stable Operations' },
};

// Convert Google Drive link to downloadable URL
function getGoogleDriveDownloadUrl(link) {
  const match = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/uc?id=${match[1]}&export=download`;
  }
  return null;
}

// Download image from Google Drive and upload to R2
async function downloadAndUploadToR2(driveLink, employeeName) {
  try {
    if (!driveLink || !r2Client) return null;
    
    const dlUrl = getGoogleDriveDownloadUrl(driveLink);
    if (!dlUrl) return null;
    
    console.log(`  ↓ Downloading image for ${employeeName}...`);
    const response = await axios.get(dlUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const bucket = process.env.R2_BUCKET || 'horsestable-storage';
    const ext = response.headers['content-type']?.includes('png') ? 'png' : 'jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const key = `profiles/employees/${uniqueName}`;
    
    console.log(`  ↑ Uploading to R2...`);
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: response.data,
        ContentType: response.headers['content-type'] || 'image/jpeg',
      })
    );
    
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`  ✓ Uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.warn(`  ✗ Failed to download/upload image for ${employeeName}:`, err.message);
    return null;
  }
}

async function seedEIRSTeam() {
  const xlsxPath = path.join(__dirname, '..', 'EIRS Contact Information (Responses).xlsx');
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`\nFound ${rows.length} entries in EIRS Contact Information\n`);

  if (r2Client) {
    console.log('📦 R2 Storage configured — images will be uploaded to Cloudflare R2\n');
  } else {
    console.log('⚠ R2 Storage not configured — profile images will not be set\n');
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    const name = (row['Name'] || '').trim();
    const email = (row['Email ID'] || '').trim().toLowerCase();
    const phoneRaw = String(row['Phone number'] || '').trim();
    const role = (row['Role'] || '').trim();
    const profilePhotoLink = (row['Profile Photo'] || '').trim();

    if (!name || !email) {
      console.log(`⚠ Skipping row with missing name/email: ${JSON.stringify(row)}`);
      errors++;
      continue;
    }

    const mapping = ROLE_MAP[role];
    if (!mapping) {
      console.log(`⚠ Unknown role "${role}" for ${name} — skipping`);
      errors++;
      continue;
    }

    // Password is the phone number as-is
    const password = phoneRaw;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Download from Google Drive and upload to R2
      let profileImage = null;
      if (profilePhotoLink) {
        profileImage = await downloadAndUploadToR2(profilePhotoLink, name);
      }

      const existing = await prisma.employee.findUnique({ where: { email } });

      if (existing) {
        await prisma.employee.update({
          where: { email },
          data: {
            fullName: name,
            password: hashedPassword,
            phoneNumber: phoneRaw,
            designation: mapping.designation,
            department: mapping.department,
            profileImage,
            employmentStatus: 'Active',
            isApproved: true,
          },
        });
        console.log(`✏ Updated: ${name} (${mapping.designation}) — ${email}`);
        updated++;
      } else {
        await prisma.employee.create({
          data: {
            fullName: name,
            email,
            password: hashedPassword,
            phoneNumber: phoneRaw,
            designation: mapping.designation,
            department: mapping.department,
            profileImage,
            employmentStatus: 'Active',
            isApproved: true,
          },
        });
        console.log(`✓ Created: ${name} (${mapping.designation}) — ${email}`);
        created++;
      }
    } catch (err) {
      console.error(`✗ Error for ${name} (${email}):`, err.message);
      errors++;
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Seed complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors/Skipped: ${errors}`);
  console.log(`========================================\n`);
  console.log(`Login credentials for all users:`);
  console.log(`   Username: their email ID`);
  console.log(`   Password: their phone number\n`);
}

seedEIRSTeam()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
