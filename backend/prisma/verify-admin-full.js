const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Full admin verification...\n');

  const admin = await prisma.employee.findUnique({
    where: { email: 'admin@efm.com' },
    include: {
      permissions: true,
    },
  });

  if (!admin) {
    console.log('❌ Admin account not found!');
    return;
  }

  console.log('✅ Admin account:');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Name: ${admin.fullName}`);
  console.log(`   Designation: ${admin.designation}`);
  console.log(`   Status: ${admin.employmentStatus}`);
  console.log(`   Approved: ${admin.isApproved}`);

  const isMatch = await bcrypt.compare('password123', admin.password);
  console.log(`   Password Match: ${isMatch ? '✅' : '❌'}`);

  if (admin.permissions) {
    console.log('\n✅ Permissions:');
    console.log(`   View Dashboard: ${admin.permissions.viewDashboard}`);
    console.log(`   Manage Employees: ${admin.permissions.manageEmployees}`);
    console.log(`   View Reports: ${admin.permissions.viewReports}`);
    console.log(`   Issue Fines: ${admin.permissions.issueFines}`);
    console.log(`   Manage Inventory: ${admin.permissions.manageInventory}`);
    console.log(`   Manage Schedules: ${admin.permissions.manageSchedules}`);
    console.log(`   View Payroll: ${admin.permissions.viewPayroll}`);
    console.log(`   View Notifications: ${admin.permissions.viewNotifications}`);
  } else {
    console.log('\n⚠️  No permissions found!');
  }

  console.log('\n✅ Admin is ready to login!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
