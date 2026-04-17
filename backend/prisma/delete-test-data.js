const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting test user data...\n');

  // Find all test users (emails ending with @test.com)
  const testUsers = await prisma.employee.findMany({
    where: {
      email: {
        endsWith: '@test.com',
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  if (testUsers.length === 0) {
    console.log('ℹ️  No test users found.');
    return;
  }

  console.log(`Found ${testUsers.length} test users to delete:\n`);
  testUsers.forEach(user => {
    console.log(`   - ${user.fullName} (${user.email})`);
  });

  const testUserIds = testUsers.map(u => u.id);

  // Delete related data first (in order of dependencies)
  console.log('\n🗑️  Deleting related data...\n');

  // Delete medicine logs created by test users (jamiedars)
  const deletedMedicineLogs = await prisma.medicineLog.deleteMany({
    where: {
      jamiedarId: { in: testUserIds },
    },
  });
  console.log(`   ✅ Deleted ${deletedMedicineLogs.count} medicine logs`);

  // Delete medicine inventory created by test users
  const deletedMedicineInventory = await prisma.medicineInventory.deleteMany({
    where: {
      recordedById: { in: testUserIds },
    },
  });
  console.log(`   ✅ Deleted ${deletedMedicineInventory.count} medicine inventory records`);

  // Delete groom worksheet entries (cascade should handle this, but being explicit)
  const groomWorksheets = await prisma.groomWorkSheet.findMany({
    where: { groomId: { in: testUserIds } },
    select: { id: true },
  });
  const groomWorksheetIds = groomWorksheets.map(w => w.id);

  if (groomWorksheetIds.length > 0) {
    const deletedEntries = await prisma.workSheetEntry.deleteMany({
      where: { worksheetId: { in: groomWorksheetIds } },
    });
    console.log(`   ✅ Deleted ${deletedEntries.count} groom worksheet entries`);

    const deletedWorksheets = await prisma.groomWorkSheet.deleteMany({
      where: { groomId: { in: testUserIds } },
    });
    console.log(`   ✅ Deleted ${deletedWorksheets.count} groom worksheets`);
  }

  // Delete attendance records
  const deletedAttendance = await prisma.attendance.deleteMany({
    where: {
      employeeId: { in: testUserIds },
    },
  });
  console.log(`   ✅ Deleted ${deletedAttendance.count} attendance records`);

  // Delete expenses created by test users
  const deletedExpenses = await prisma.expense.deleteMany({
    where: {
      createdById: { in: testUserIds },
    },
  });
  console.log(`   ✅ Deleted ${deletedExpenses.count} expenses`);

  // Delete tasks assigned to or created by test users
  const deletedTasks = await prisma.task.deleteMany({
    where: {
      OR: [
        { assignedEmployeeId: { in: testUserIds } },
        { createdById: { in: testUserIds } },
      ],
    },
  });
  console.log(`   ✅ Deleted ${deletedTasks.count} tasks`);

  // Clear supervisor relationships for employees supervised by test users
  await prisma.employee.updateMany({
    where: {
      supervisorId: { in: testUserIds },
    },
    data: {
      supervisorId: null,
    },
  });
  console.log(`   ✅ Cleared supervisor relationships`);

  // Delete horses supervised by test users (if any)
  const deletedHorses = await prisma.horse.deleteMany({
    where: {
      supervisorId: { in: testUserIds },
    },
  });
  console.log(`   ✅ Deleted ${deletedHorses.count} horses supervised by test users`);

  // Finally, delete the test users themselves
  const deletedUsers = await prisma.employee.deleteMany({
    where: {
      email: {
        endsWith: '@test.com',
      },
    },
  });

  console.log(`\n✅ Deleted ${deletedUsers.count} test users\n`);
  console.log('🎉 Test data cleanup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Deletion failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
