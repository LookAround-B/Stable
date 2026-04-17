const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Creating admin user...\n');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.employee.upsert({
    where: { email: 'admin@efm.com' },
    update: {
      password: hashedPassword,
      fullName: 'Admin',
      designation: 'Super Admin',
      department: 'Leadership',
      employmentStatus: 'Active',
      isApproved: true,
    },
    create: {
      email: 'admin@efm.com',
      password: hashedPassword,
      fullName: 'Admin',
      designation: 'Super Admin',
      department: 'Leadership',
      employmentStatus: 'Active',
      isApproved: true,
    },
  });

  // Create/update admin permissions (full access)
  await prisma.employeePermission.upsert({
    where: { employeeId: admin.id },
    update: {
      viewDashboard: true,
      manageEmployees: true,
      viewReports: true,
      issueFines: true,
      manageInventory: true,
      manageSchedules: true,
      viewPayroll: true,
      viewNotifications: true,
    },
    create: {
      employeeId: admin.id,
      viewDashboard: true,
      manageEmployees: true,
      viewReports: true,
      issueFines: true,
      manageInventory: true,
      manageSchedules: true,
      viewPayroll: true,
      viewNotifications: true,
    },
  });

  console.log('✅ Admin user created/updated:\n');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: password123`);
  console.log(`   Name: ${admin.fullName}`);
  console.log(`   Designation: ${admin.designation}`);
  console.log(`   Status: ${admin.employmentStatus}`);
  console.log(`   Permissions: Full Access`);
  console.log('\n🎉 You can now login with these credentials!\n');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
