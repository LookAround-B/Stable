const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeTestAccounts() {
  console.log('\n🗑️  Removing test accounts (except admin@test.com)...\n');

  // Find all test accounts except admin
  const testAccounts = await prisma.employee.findMany({
    where: {
      email: { endsWith: '@test.com' },
      NOT: { email: 'admin@test.com' },
    },
    select: { id: true, fullName: true, email: true },
  });

  if (testAccounts.length === 0) {
    console.log('No test accounts found to remove.');
    return;
  }

  console.log(`Found ${testAccounts.length} test accounts to remove:\n`);
  for (const acc of testAccounts) {
    console.log(`  - ${acc.fullName} (${acc.email})`);
  }

  const ids = testAccounts.map(a => a.id);

  // Delete related records first (foreign key constraints)
  const tables = [
    'Attendance', 'GateEntry', 'GroomWorkSheet', 'InstructorDailyWorkRecord',
    'HorseFeed', 'Expense', 'InspectionRound', 'JamedarRoundCheck', 'Fine',
    'MeetingParticipant', 'Meeting', 'FeedInventory', 'MedicineInventory',
    'MedicineLog', 'GroceriesInventory', 'WorkRecord', 'FarrierShoeing',
    'Task', 'AttendanceLog', 'HealthRecord', 'Approval', 'Report',
    'AuditLog', 'Notification', 'HorseCareTeam', 'GateAttendanceLog',
    'EmployeePermission',
  ];

  console.log('\nCleaning up related records...');

  // Delete EmployeePermission
  await prisma.employeePermission.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete tasks (both assigned and created)
  await prisma.task.deleteMany({ where: { OR: [{ assignedEmployeeId: { in: ids } }, { createdById: { in: ids } }] } }).catch(() => {});

  // Delete attendance logs
  await prisma.attendanceLog.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete health records
  await prisma.healthRecord.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete approvals
  await prisma.approval.deleteMany({ where: { approverId: { in: ids } } }).catch(() => {});

  // Delete reports
  await prisma.report.deleteMany({ where: { OR: [{ reporterEmployeeId: { in: ids } }, { reportedEmployeeId: { in: ids } }] } }).catch(() => {});

  // Delete audit logs
  await prisma.auditLog.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete notifications
  await prisma.notification.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete horse care team assignments
  await prisma.horseCareTeam.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete gate attendance logs
  await prisma.gateAttendanceLog.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete attendance records
  await prisma.attendance.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete groom work sheets
  await prisma.groomWorkSheet.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete gate entries
  await prisma.gateEntry.deleteMany({ where: { OR: [{ guardId: { in: ids } }, { employeeId: { in: ids } }] } }).catch(() => {});

  // Delete instructor daily work records
  await prisma.instructorDailyWorkRecord.deleteMany({ where: { OR: [{ instructorId: { in: ids } }, { riderId: { in: ids } }] } }).catch(() => {});

  // Delete horse feed records
  await prisma.horseFeed.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete expenses
  await prisma.expense.deleteMany({ where: { OR: [{ createdById: { in: ids } }, { employeeId: { in: ids } }] } }).catch(() => {});

  // Delete inspection rounds
  await prisma.inspectionRound.deleteMany({ where: { OR: [{ employeeId: { in: ids } }, { resolvedById: { in: ids } }] } }).catch(() => {});

  // Delete jamedar round checks
  await prisma.jamedarRoundCheck.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete fines
  await prisma.fine.deleteMany({ where: { OR: [{ issuedById: { in: ids } }, { issuedToId: { in: ids } }, { resolvedById: { in: ids } }] } }).catch(() => {});

  // Delete meeting participants
  await prisma.meetingParticipant.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete meetings
  await prisma.meeting.deleteMany({ where: { createdById: { in: ids } } }).catch(() => {});

  // Delete feed inventory
  await prisma.feedInventory.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete medicine inventory
  await prisma.medicineInventory.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete medicine logs
  await prisma.medicineLog.deleteMany({ where: { OR: [{ jamiedarId: { in: ids } }, { approvedById: { in: ids } }] } }).catch(() => {});

  // Delete groceries inventory
  await prisma.groceriesInventory.deleteMany({ where: { OR: [{ employeeId: { in: ids } }, { createdById: { in: ids } }] } }).catch(() => {});

  // Delete work records
  await prisma.workRecord.deleteMany({ where: { employeeId: { in: ids } } }).catch(() => {});

  // Delete farrier shoeings
  await prisma.farrierShoeing.deleteMany({ where: { farrierId: { in: ids } } }).catch(() => {});

  // Clear supervisor references pointing to test accounts
  await prisma.employee.updateMany({
    where: { supervisorId: { in: ids } },
    data: { supervisorId: null },
  }).catch(() => {});

  // Now delete the test employees
  console.log('\nDeleting test accounts...');
  const result = await prisma.employee.deleteMany({
    where: {
      email: { endsWith: '@test.com' },
      NOT: { email: 'admin@test.com' },
    },
  });

  console.log(`\n✅ Removed ${result.count} test accounts!`);
  console.log('   Kept: admin@test.com\n');
}

removeTestAccounts()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
