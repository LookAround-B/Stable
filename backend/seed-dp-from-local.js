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

async function seedDPFromLocal() {
  console.log('\n🖼️  Seeding profile pictures from local dp-images folder...\n');

  const dpFolderPath = path.join(__dirname, '..', 'dp-images');

  // Check if folder exists
  if (!fs.existsSync(dpFolderPath)) {
    console.error(`❌ Error: "${dpFolderPath}" folder not found!`);
    console.log(`Please create the folder and add your images there.`);
    process.exit(1);
  }

  // Get all files in dp-images folder
  const files = fs.readdirSync(dpFolderPath).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  });

  if (files.length === 0) {
    console.error(`❌ No image files found in "${dpFolderPath}"`);
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} image files\n`);

  if (r2Client) {
    console.log('📦 R2 Storage configured — images will be uploaded to Cloudflare R2\n');
  } else {
    console.log('⚠ R2 Storage not configured — profile images will not be set\n');
    process.exit(1);
  }

  let updated = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(dpFolderPath, file);
    const fileName = path.parse(file).name; // Remove extension

    console.log(`\nProcessing: ${file}`);

    try {
      // Find employee by name (case-insensitive, partial match)
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { fullName: { contains: fileName, mode: 'insensitive' } },
            { email: { contains: fileName, mode: 'insensitive' } },
          ],
        },
      });

      if (!employee) {
        console.log(`  ⚠ No employee found matching "${fileName}" — skipping`);
        errors++;
        continue;
      }

      // Upload image to R2
      const profileImage = await uploadImageToR2(filePath, employee.fullName);

      if (profileImage) {
        // Update employee with new profile image URL
        await prisma.employee.update({
          where: { id: employee.id },
          data: {
            profileImage,
          },
        });

        console.log(`  ✓ Updated: ${employee.fullName} (${employee.email})`);
        updated++;
      } else {
        errors++;
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${file}:`, err.message);
      errors++;
    }
  }

  console.log(`\n========================================`);
  console.log(`✅ Done!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors/Skipped: ${errors}`);
  console.log(`========================================\n`);
}

seedDPFromLocal()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
