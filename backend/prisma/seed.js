const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with comprehensive test data...');

  // Clear existing data - delete in order of dependencies
  await prisma.expense.deleteMany({});
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
      email: 'jamedar2@test.com',
      password: 'password123',
      fullName: 'Anand Jamedar',
      designation: 'Jamedar',
      department: 'Stable Operations',
      phoneNumber: '555-0006b',
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
      email: 'groom2@test.com',
      password: 'password123',
      fullName: 'Michael Groom',
      designation: 'Groom',
      department: 'Stable Operations',
      phoneNumber: '555-0007b',
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
    
    // Restaurant Operations Department
    {
      email: 'restaurant-manager@test.com',
      password: 'password123',
      fullName: 'Marco Restaurant Manager',
      designation: 'Restaurant Manager',
      department: 'Restaurant Operations',
      phoneNumber: '555-0016b',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'kitchen-helper@test.com',
      password: 'password123',
      fullName: 'Tony Kitchen Helper',
      designation: 'Kitchen Helper',
      department: 'Restaurant Operations',
      phoneNumber: '555-0016c',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'waiter@test.com',
      password: 'password123',
      fullName: 'Giovanni Waiter',
      designation: 'Waiter',
      department: 'Restaurant Operations',
      phoneNumber: '555-0016d',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    
    // Accounts/Administration Department
    {
      email: 'senior-exec-admin@test.com',
      password: 'password123',
      fullName: 'Rachel Senior Executive Admin',
      designation: 'Senior Executive Admin',
      department: 'Accounts/Administration',
      phoneNumber: '555-0017',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'junior-exec-admin@test.com',
      password: 'password123',
      fullName: 'Kevin Junior Executive Admin',
      designation: 'Junior Executive Admin',
      department: 'Accounts/Administration',
      phoneNumber: '555-0017b',
      shiftTiming: null,
      employmentStatus: 'Active',
      isApproved: true,
    },
    {
      email: 'senior-accounts@test.com',
      password: 'password123',
      fullName: 'Patricia Senior Accounts',
      designation: 'Senior Executive - Accounts',
      department: 'Accounts/Administration',
      phoneNumber: '555-0018',
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
      phoneNumber: '555-0019',
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
      phoneNumber: '555-0020',
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
    // Stable Operations - Emma Manager supervises Jamadars
    { subordinate: 'jamedar@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'jamedar2@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'instructor@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'riding-boy@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'rider@test.com', supervisor: 'manager@test.com' },
    { subordinate: 'farrier@test.com', supervisor: 'manager@test.com' },
    
    // Jamedar Raj supervises Sarah Groom and other staff
    { subordinate: 'groom@test.com', supervisor: 'jamedar@test.com' },
    
    // Jamedar Anand supervises Michael Groom and other staff
    { subordinate: 'groom2@test.com', supervisor: 'jamedar2@test.com' },
    
    // Ground Operations - Ground Supervisor supervises Guards, Electrician, Gardener, Housekeeping
    { subordinate: 'guard@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'guard2@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'electrician@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'gardener@test.com', supervisor: 'ground-supervisor@test.com' },
    { subordinate: 'housekeeping@test.com', supervisor: 'ground-supervisor@test.com' },
    
    // Restaurant Operations - Restaurant Manager supervises Kitchen Helper and Waiter
    { subordinate: 'kitchen-helper@test.com', supervisor: 'restaurant-manager@test.com' },
    { subordinate: 'waiter@test.com', supervisor: 'restaurant-manager@test.com' },
    
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

  // Seed horses
  console.log('\n🐴 Seeding Horses...');
  const horseNames = [
    'Alta Strada', 'Vallee', 'Dejavu', 'Tara', 'Smile Stone', 'Perseus', 'Prada', 'Rodrigo',
    'Zara', 'Fabia', 'Claudia', 'Cadillac', 'Maximus', 'Cesat', 'Pluto', 'Rebelda',
    'Sheeba', 'Fudge', 'Poppy', 'Sil Colman', 'Saraswathi', 'Leon', 'Starlight', 'General',
  ];

  for (const horseName of horseNames) {
    const horse = await prisma.horse.upsert({
      where: { name: horseName },
      update: {},
      create: {
        name: horseName,
        gender: Math.random() > 0.5 ? 'Mare' : 'Stallion',
        dateOfBirth: new Date(2015, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        breed: 'Thoroughbred',
        color: ['Bay', 'Chestnut', 'Black', 'Grey'].sort(() => Math.random() - 0.5)[0],
        status: 'Active',
        stableNumber: `ST-${horseNames.indexOf(horseName) + 1}`,
        supervisorId: createdUsers['manager@test.com']?.id || null,
      },
    });
  }

  console.log(`✅ Seeded ${horseNames.length} horses`);

  // Seed sample expenses for testing
  console.log('\n💳 Seeding Sample Expenses...');
  const allHorses = await prisma.horse.findMany({ take: 5 });
  const allEmployees = await prisma.employee.findMany({ take: 5 });
  const seniorAccountsUser = createdUsers['senior-accounts@test.com'];

  if (seniorAccountsUser && allHorses.length > 0) {
    const expenseTypes = ['Medicine', 'Treatment', 'Maintenance', 'Miscellaneous'];
    
    for (let i = 0; i < 10; i++) {
      const randomType = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
      const horse = allHorses[i % allHorses.length];
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Random date within last 30 days

      await prisma.expense.create({
        data: {
          type: randomType,
          amount: Math.floor(Math.random() * 5000) + 500, // 500 - 5500
          description: `Sample ${randomType} expense for testing`,
          date: date,
          createdById: seniorAccountsUser.id,
          horseId: horse.id,
          attachments: null,
        },
      });
    }

    console.log(`✅ Seeded 10 sample expenses`);
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

  // Seed Medicine Inventory
  console.log('\n💊 Seeding Medicine Inventory...');
  const managerUser = createdUsers['manager@test.com'];

  if (managerUser) {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const medicines = [
      { medicineType: 'Phenylbutazone (Bute)', unit: 'tablets', openingStock: 200, unitsPurchased: 50, totalUsed: 65, unitsLeft: 185, threshold: 40, notes: 'Common NSAID for pain and inflammation' },
      { medicineType: 'Banamine (Flunixin)', unit: 'vials', openingStock: 30, unitsPurchased: 10, totalUsed: 12, unitsLeft: 28, threshold: 8, notes: 'Anti-inflammatory and analgesic injection' },
      { medicineType: 'Adequan (PSGAG)', unit: 'syringes', openingStock: 24, unitsPurchased: 12, totalUsed: 16, unitsLeft: 20, threshold: 6, notes: 'Injectable joint supplement for degenerative joint disease' },
      { medicineType: 'Legend (Hyaluronate Sodium)', unit: 'vials', openingStock: 15, unitsPurchased: 5, totalUsed: 8, unitsLeft: 12, threshold: 4, notes: 'Joint fluid therapy for synovitis' },
      { medicineType: 'Gastrogard (Omeprazole)', unit: 'tubes', openingStock: 40, unitsPurchased: 20, totalUsed: 25, unitsLeft: 35, threshold: 10, notes: 'Gastric ulcer treatment and prevention' },
      { medicineType: 'Excede (Ceftiofur)', unit: 'bottles', openingStock: 10, unitsPurchased: 5, totalUsed: 7, unitsLeft: 8, threshold: 3, notes: 'Long-acting antibiotic for respiratory infections' },
      { medicineType: 'Eqvalan (Ivermectin Paste)', unit: 'syringes', openingStock: 50, unitsPurchased: 25, totalUsed: 33, unitsLeft: 42, threshold: 15, notes: 'Broad-spectrum dewormer' },
      { medicineType: 'Panacur (Fenbendazole)', unit: 'tubes', openingStock: 35, unitsPurchased: 15, totalUsed: 20, unitsLeft: 30, threshold: 10, notes: 'Anthelmintic for parasite control' },
      { medicineType: 'Dexamethasone', unit: 'vials', openingStock: 25, unitsPurchased: 10, totalUsed: 13, unitsLeft: 22, threshold: 6, notes: 'Corticosteroid anti-inflammatory' },
      { medicineType: 'Pentosan Equine (Cartrophen)', unit: 'vials', openingStock: 20, unitsPurchased: 10, totalUsed: 12, unitsLeft: 18, threshold: 5, notes: 'Disease-modifying osteoarthritis drug' },
      { medicineType: 'Regumate (Altrenogest)', unit: 'bottles', openingStock: 8, unitsPurchased: 4, totalUsed: 6, unitsLeft: 6, threshold: 2, notes: 'Synthetic progestin for mare cycle regulation' },
      { medicineType: 'Equioxx (Firocoxib)', unit: 'tubes', openingStock: 45, unitsPurchased: 20, totalUsed: 27, unitsLeft: 38, threshold: 12, notes: 'COX-2 selective NSAID for osteoarthritis' },
      { medicineType: 'SMZ-TMP (Sulfamethoxazole)', unit: 'tablets', openingStock: 300, unitsPurchased: 100, totalUsed: 125, unitsLeft: 275, threshold: 60, notes: 'Broad-spectrum antibiotic combination' },
      { medicineType: 'Vetalog (Triamcinolone)', unit: 'vials', openingStock: 18, unitsPurchased: 6, totalUsed: 10, unitsLeft: 14, threshold: 4, notes: 'Corticosteroid for intra-articular injection' },
      { medicineType: 'Osphos (Clodronate)', unit: 'vials', openingStock: 12, unitsPurchased: 6, totalUsed: 8, unitsLeft: 10, threshold: 3, notes: 'Bisphosphonate for navicular syndrome' },
    ];

    for (const med of medicines) {
      await prisma.medicineInventory.upsert({
        where: {
          medicineType_month_year: {
            medicineType: med.medicineType,
            month: currentMonth,
            year: currentYear,
          },
        },
        update: {
          openingStock: med.openingStock,
          unitsPurchased: med.unitsPurchased,
          totalUsed: med.totalUsed,
          unitsLeft: med.unitsLeft,
          unit: med.unit,
          threshold: med.threshold,
          notes: med.notes,
        },
        create: {
          medicineType: med.medicineType,
          month: currentMonth,
          year: currentYear,
          openingStock: med.openingStock,
          unitsPurchased: med.unitsPurchased,
          totalUsed: med.totalUsed,
          unitsLeft: med.unitsLeft,
          unit: med.unit,
          threshold: med.threshold,
          notes: med.notes,
          recordedById: managerUser.id,
        },
      });
    }

    console.log(`✅ Seeded ${medicines.length} medicine inventory records`);
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
