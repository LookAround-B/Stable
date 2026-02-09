const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with comprehensive test data...');

  // Clear existing data - delete in order of dependencies
  await prisma.attendance.deleteMany({});
  await prisma.groomWorkSheet.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.horse.deleteMany({});
  await prisma.employee.deleteMany({});

  // Create test users with proper role hierarchy
  const testUsers = [
    // Leadership Department
    {
      email: 'admin@test.com',
      password: 'password123',
      fullName: 'Admin User',
      designation: 'Super Admin',
      department: 'Leadership',
      phoneNumber: '555-0001',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'director@test.com',
      password: 'password123',
      fullName: 'Dr. Director',
      designation: 'Director',
      department: 'Leadership',
      phoneNumber: '555-0002',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'school-admin@test.com',
      password: 'password123',
      fullName: 'School Administrator',
      designation: 'School Administrator',
      department: 'Leadership',
      phoneNumber: '555-0003',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    
    // Stable Operations Department
    {
      email: 'manager@test.com',
      password: 'password123',
      fullName: 'Emma Manager',
      designation: 'Stable Manager',
      department: 'Stable Operations',
      phoneNumber: '555-0004',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'instructor@test.com',
      password: 'password123',
      fullName: 'James Instructor',
      designation: 'Instructor',
      department: 'Stable Operations',
      phoneNumber: '555-0005',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'jamedar@test.com',
      password: 'password123',
      fullName: 'Raj Jamedar',
      designation: 'Jamedar',
      department: 'Stable Operations',
      phoneNumber: '555-0006',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'groom@test.com',
      password: 'password123',
      fullName: 'Sarah Groom',
      designation: 'Groom',
      department: 'Stable Operations',
      phoneNumber: '555-0007',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'riding-boy@test.com',
      password: 'password123',
      fullName: 'Tommy Riding Boy',
      designation: 'Riding Boy',
      department: 'Stable Operations',
      phoneNumber: '555-0008',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'rider@test.com',
      password: 'password123',
      fullName: 'Alex Rider',
      designation: 'Rider',
      department: 'Stable Operations',
      phoneNumber: '555-0009',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'farrier@test.com',
      password: 'password123',
      fullName: 'Mike Farrier',
      designation: 'Farrier',
      department: 'Stable Operations',
      phoneNumber: '555-0010',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    
    // Ground Operations Department
    {
      email: 'ground-supervisor@test.com',
      password: 'password123',
      fullName: 'Mike Supervisor',
      designation: 'Ground Supervisor',
      department: 'Ground Operations',
      phoneNumber: '555-0011',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'guard@test.com',
      password: 'password123',
      fullName: 'John Guard',
      designation: 'Guard',
      department: 'Ground Operations',
      phoneNumber: '555-0012',
      shiftTiming: 'Morning',
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'guard2@test.com',
      password: 'password123',
      fullName: 'David Guard',
      designation: 'Guard',
      department: 'Ground Operations',
      phoneNumber: '555-0013',
      shiftTiming: 'Evening',
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'electrician@test.com',
      password: 'password123',
      fullName: 'Robert Electrician',
      designation: 'Electrician',
      department: 'Ground Operations',
      phoneNumber: '555-0014',
      shiftTiming: 'Day',
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'gardener@test.com',
      password: 'password123',
      fullName: 'Peter Gardener',
      designation: 'Gardener',
      department: 'Ground Operations',
      phoneNumber: '555-0015',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'housekeeping@test.com',
      password: 'password123',
      fullName: 'Lisa Housekeeping',
      designation: 'Housekeeping',
      department: 'Ground Operations',
      phoneNumber: '555-0016',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    
    // Accounts/Administration Department
    {
      email: 'senior-accounts@test.com',
      password: 'password123',
      fullName: 'Patricia Senior Accounts',
      designation: 'Senior Executive Accounts',
      department: 'Accounts/Administration',
      phoneNumber: '555-0017',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'executive-accounts@test.com',
      password: 'password123',
      fullName: 'Charles Executive Accounts',
      designation: 'Executive Accounts',
      department: 'Accounts/Administration',
      phoneNumber: '555-0018',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'executive-admin@test.com',
      password: 'password123',
      fullName: 'Susan Executive Admin',
      designation: 'Executive Admin',
      department: 'Accounts/Administration',
      phoneNumber: '555-0019',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
  ];

  const createdUsers = {};

  // Create users and store them for supervisor relationships
  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const created = await prisma.employee.create({
      data: {
        email: user.email,
        password: hashedPassword,
        fullName: user.fullName,
        designation: user.designation,
        department: user.department,
        phoneNumber: user.phoneNumber,
        shiftTiming: user.shiftTiming,
        employmentStatus: user.employmentStatus,
        isApproved: user.isApproved,
      },
    });

    createdUsers[user.email] = created;
    console.log(`✅ Created: ${created.fullName} (${created.email}) - ${created.designation}`);
  }

  // Set up supervisor relationships
  const supervisorRelationships = [
    // Stable Operations - Emma Manager supervises Jamedar and Groom
    { subordinate: 'jamedar@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'groom@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'riding-boy@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'rider@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'farrier@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'instructor@test.com', supervisor: 'manager@test.com' },
    
    // Ground Operations - Ground Supervisor supervises Guards, Electrician, Gardener, Housekeeping
    { subordinate: 'guard@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'guard2@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'electrician@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'gardener@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'housekeeping@test.com', supervisor: 'ground-supervisor@test.com' },
    
    // Accounts - Senior Accounts supervises Executive Accounts
    { subordinate: 'executive-accounts@test.com', supervisor: 'senior-accounts@test.com' },
    { subordinate: 'executive-admin@test.com', supervisor: 'senior-accounts@test.com' },
  ];

  // Apply supervisor relationships
  for (const rel of supervisorRelationships) {
    if (createdUsers[rel.subordinate] && createdUsers[rel.supervisor]) {
      await prisma.employee.update({
        where: { id: createdUsers[rel.subordinate].id },
        data: {
          supervisorId: createdUsers[rel.supervisor].id,
        },
      });
      console.log(`📋 Set supervisor: ${createdUsers[rel.supervisor].fullName} → ${createdUsers[rel.subordinate].fullName}`);
    }
  }

  // Seed attendance data for today
  console.log('\n🔄 Seeding Attendance Records...');
  const attendanceDate = new Date();
  attendanceDate.setHours(0, 0, 0, 0);

  const attendanceUsers = Object.values(createdUsers).slice(0, 15); // Take first 15 users

  for (let i = 0; i < attendanceUsers.length; i++) {
    const emp = attendanceUsers[i];
    const statuses = ['Present', 'Absent', 'Leave', 'WOFF', 'Half Day'];
    const status = statuses[i % statuses.length];

    const checkInTime =
      status === 'Present'
        ? new Date(attendanceDate.getTime() + (5 + i % 4) * 3600 * 1000 + Math.random() * 60 * 60 * 1000)
        : null;

    const checkOutTime =
      status === 'Present'
        ? new Date(attendanceDate.getTime() + (17 + i % 3) * 3600 * 1000 + Math.random() * 60 * 60 * 1000)
        : null;

    await prisma.attendance.create({
      data: {
        employeeId: emp.id,
        date: attendanceDate,
        checkInTime,
        checkOutTime,
        status,
        remarks: status !== 'Present' ? `Status: ${status}` : null,
      },
    });
  }

  console.log(`✅ Seeded ${attendanceUsers.length} attendance records`);

  // Seed groom worksheet data
  console.log('\n🔄 Seeding Groom Work Sheets...');
  const horses = await prisma.horse.findMany({ take: 5 });
  const groomUsers = Object.values(createdUsers).filter((u) => u.designation === 'Groom').slice(0, 3);

  if (horses.length > 0 && groomUsers.length > 0) {
    const worksheetDate = new Date();
    worksheetDate.setHours(0, 0, 0, 0);

    for (const groom of groomUsers) {
      const horsesToAssign = horses.slice(0, Math.min(3, horses.length));

      await prisma.groomWorkSheet.create({
        data: {
          groomId: groom.id,
          date: worksheetDate,
          totalAM: 5,
          totalPM: 7,
          wholeDayHours: 12,
          woodchipsUsed: 15,
          bichaliUsed: 30,
          booSaUsed: 10,
          remarks: `Daily grooming work - ${groom.fullName}`,
          entries: {
            create: horsesToAssign.map((horse, index) => ({
              horseId: horse.id,
              amHours: 1.5 + index * 0.5,
              pmHours: 2 + index * 0.5,
              wholeDayHours: 3.5 + index,
              woodchipsUsed: 5,
              bichaliUsed: 10,
              booSaUsed: 3,
              remarks: `${horse.name} - grooming and care completed`,
            })),
          },
        },
      });
    }

    console.log(`✅ Seeded ${groomUsers.length} groom worksheets`);
  }


  console.log('\n✅ Database seeding complete!');
  console.log('\n📊 Role Summary:');
  console.log('   🔑 Leadership: admin@test.com, director@test.com, school-admin@test.com');
  console.log('   🐴 Stable Operations: manager@test.com, instructor@test.com, jamedar@test.com, groom@test.com, etc.');
  console.log('   🚪 Ground Operations: ground-supervisor@test.com, guard@test.com, electrician@test.com, etc.');
  console.log('   📊 Accounts/Administration: senior-accounts@test.com, executive-accounts@test.com, executive-admin@test.com');
  console.log('\n📝 All users use password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
