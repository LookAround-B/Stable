const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

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

// Convert Google Drive link to downloadable URL — REMOVED (DPs seeded separately from dp-images folder)

async function seedEIRSTeam() {
  const xlsxPath = path.join(__dirname, '..', 'EIRS Contact Information (Responses).xlsx');
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`\nFound ${rows.length} entries in EIRS Contact Information\n`);
  console.log('ℹ Profile pictures will be seeded separately via seed-dp-from-local.js\n');

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const row of rows) {
    const name = (row['Name'] || '').trim();
    const email = (row['Email ID'] || '').trim().toLowerCase();
    const phoneRaw = String(row['Phone number'] || '').trim();
    const role = (row['Role'] || '').trim();

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
