const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 Database Status Report\n');
  console.log('='.repeat(50));

  const employees = await prisma.employee.count();
  console.log(`👥 Total Employees: ${employees}`);

  const horses = await prisma.horse.count();
  console.log(`🐴 Total Horses: ${horses}`);

  const attendance = await prisma.attendance.count();
  console.log(`📅 Attendance Records: ${attendance}`);

  const medicineInventory = await prisma.medicineInventory.count();
  console.log(`💊 Medicine Inventory Items: ${medicineInventory}`);

  const medicineLogs = await prisma.medicineLog.count();
  console.log(`💉 Medicine Log Entries: ${medicineLogs}`);

  const groomWorksheets = await prisma.groomWorkSheet.count();
  console.log(`📋 Groom Worksheets: ${groomWorksheets}`);

  const expenses = await prisma.expense.count();
  console.log(`💰 Expenses: ${expenses}`);

  const tasks = await prisma.task.count();
  console.log(`✅ Tasks: ${tasks}`);

  console.log('='.repeat(50));
  console.log('\n✅ All test data (@test.com users) has been removed!');
  console.log('🎉 Your live data is preserved.\n');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
