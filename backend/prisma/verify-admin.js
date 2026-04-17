const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking admin account...\n');

  const admin = await prisma.employee.findUnique({
    where: { email: 'admin@efm.com' },
  });

  if (!admin) {
    console.log('❌ Admin account not found!');
    return;
  }

  console.log('✅ Admin account found:');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Name: ${admin.fullName}`);
  console.log(`   Designation: ${admin.designation}`);
  console.log(`   Status: ${admin.employmentStatus}`);
  console.log(`   Approved: ${admin.isApproved}`);
  console.log(`   Password Hash: ${admin.password.substring(0, 20)}...`);

  // Test password
  const testPassword = 'password123';
  const isMatch = await bcrypt.compare(testPassword, admin.password);

  console.log(`\n🔐 Password verification:`);
  console.log(`   Testing password: "${testPassword}"`);
  console.log(`   Match: ${isMatch ? '✅ YES' : '❌ NO'}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
