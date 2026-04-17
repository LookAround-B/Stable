const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function getDayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

async function createAttendanceIfMissing(record) {
  if (!record.employeeId) return false;

  const { start, end } = getDayRange(record.date);
  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId: record.employeeId,
      date: {
        gte: start,
        lt: end,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await prisma.attendance.create({
    data: {
      employeeId: record.employeeId,
      date: start,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: record.status,
    },
  });

  return true;
}

async function createGroomWorksheetIfMissing(groomId, horses, date) {
  if (!groomId || !horses.length) return false;

  const { start, end } = getDayRange(date);
  const existing = await prisma.groomWorkSheet.findFirst({
    where: {
      groomId,
      date: {
        gte: start,
        lt: end,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await prisma.groomWorkSheet.create({
    data: {
      groomId,
      date: start,
      totalAM: 5,
      totalPM: 7,
      wholeDayHours: 12,
      woodchipsUsed: 15,
      bichaliUsed: 30,
      booSaUsed: 10,
      remarks: 'Daily maintenance completed',
      entries: {
        create: horses.map((horse, index) => ({
          horseId: horse.id,
          amHours: 1.5 + index * 0.5,
          pmHours: 2 + index * 0.5,
          wholeDayHours: 3.5 + index,
          woodchipsUsed: 5,
          bichaliUsed: 10,
          booSaUsed: 3,
          remarks: `${horse.name} grooming completed`,
        })),
      },
    },
  });

  return true;
}

async function main() {
  console.log('Seeding database with non-destructive sample data...');

  const testUsers = [
    {
      email: 'admin@test.com',
      password: 'password123',
      fullName: 'Admin User',
      designation: 'Super Admin',
      department: 'Leadership',
      phoneNumber: '555-0001',
    },
    {
      email: 'guard@test.com',
      password: 'password123',
      fullName: 'John Guard',
      designation: 'Guard',
      department: 'Ground Operations',
      phoneNumber: '555-0002',
    },
    {
      email: 'groom@test.com',
      password: 'password123',
      fullName: 'Sarah Groom',
      designation: 'Groom',
      department: 'Stable Operations',
      phoneNumber: '555-0003',
    },
    {
      email: 'jamedar@test.com',
      password: 'password123',
      fullName: 'Raj Jamedar',
      designation: 'Jamedar',
      department: 'Stable Operations',
      phoneNumber: '555-0004',
    },
    {
      email: 'manager@test.com',
      password: 'password123',
      fullName: 'Emma Manager',
      designation: 'Stable Manager',
      department: 'Stable Operations',
      phoneNumber: '555-0005',
    },
    {
      email: 'supervisor@test.com',
      password: 'password123',
      fullName: 'Mike Supervisor',
      designation: 'Ground Supervisor',
      department: 'Ground Operations',
      phoneNumber: '555-0006',
    },
    {
      email: 'director@test.com',
      password: 'password123',
      fullName: 'Dr. Director',
      designation: 'Director',
      department: 'Leadership',
      phoneNumber: '555-0007',
    },
    {
      email: 'instructor@test.com',
      password: 'password123',
      fullName: 'Alex Instructor',
      designation: 'Instructor',
      department: 'Stable Operations',
      phoneNumber: '555-0008',
    },
    {
      email: 'rider@test.com',
      password: 'password123',
      fullName: 'John Rider',
      designation: 'Rider',
      department: 'Riding Program',
      phoneNumber: '555-0009',
    },
    {
      email: 'riding-boy@test.com',
      password: 'password123',
      fullName: 'Tommy Riding Boy',
      designation: 'Riding Boy',
      department: 'Riding Program',
      phoneNumber: '555-0010',
    },
  ];

  const createdEmployees = {};

  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const created = await prisma.employee.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        designation: user.designation,
        department: user.department,
        phoneNumber: user.phoneNumber,
        password: hashedPassword,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        fullName: user.fullName,
        designation: user.designation,
        department: user.department,
        phoneNumber: user.phoneNumber,
      },
    });

    createdEmployees[user.email] = created.id;
    console.log(`Ensured user: ${created.fullName} (${created.email})`);
  }

  const jamedarId = createdEmployees['jamedar@test.com'];
  if (jamedarId) {
    await prisma.employee.update({
      where: { email: 'groom@test.com' },
      data: { supervisorId: jamedarId },
    });
    console.log('Ensured supervisor relationship for groom@test.com');
  }

  const attendanceDate = new Date();
  attendanceDate.setHours(0, 0, 0, 0);

  const attendanceRecords = [
    {
      employeeId: (await prisma.employee.findUnique({ where: { email: 'admin@test.com' } }))?.id,
      date: attendanceDate,
      status: 'Present',
      checkInTime: new Date(attendanceDate.getTime() + 5 * 3600 * 1000 + 43 * 60 * 1000),
      checkOutTime: new Date(attendanceDate.getTime() + 17 * 3600 * 1000 + 40 * 60 * 1000),
    },
    {
      employeeId: (await prisma.employee.findUnique({ where: { email: 'guard@test.com' } }))?.id,
      date: attendanceDate,
      status: 'Present',
      checkInTime: new Date(attendanceDate.getTime() + 6 * 3600 * 1000 + 5 * 60 * 1000),
      checkOutTime: new Date(attendanceDate.getTime() + 18 * 3600 * 1000),
    },
    {
      employeeId: (await prisma.employee.findUnique({ where: { email: 'groom@test.com' } }))?.id,
      date: attendanceDate,
      status: 'Present',
      checkInTime: new Date(attendanceDate.getTime() + 6 * 3600 * 1000),
      checkOutTime: new Date(attendanceDate.getTime() + 17 * 3600 * 1000 + 25 * 60 * 1000),
    },
    {
      employeeId: (await prisma.employee.findUnique({ where: { email: 'jamedar@test.com' } }))?.id,
      date: attendanceDate,
      status: 'Leave',
    },
    {
      employeeId: (await prisma.employee.findUnique({ where: { email: 'manager@test.com' } }))?.id,
      date: attendanceDate,
      status: 'WOFF',
    },
    {
      employeeId: (await prisma.employee.findUnique({ where: { email: 'supervisor@test.com' } }))?.id,
      date: attendanceDate,
      status: 'Present',
      checkInTime: new Date(attendanceDate.getTime() + 5 * 3600 * 1000 + 50 * 60 * 1000),
      checkOutTime: new Date(attendanceDate.getTime() + 17 * 3600 * 1000 + 45 * 60 * 1000),
    },
    {
      employeeId: (await prisma.employee.findUnique({ where: { email: 'director@test.com' } }))?.id,
      date: attendanceDate,
      status: 'Present',
      checkInTime: new Date(attendanceDate.getTime() + 7 * 3600 * 1000),
      checkOutTime: new Date(attendanceDate.getTime() + 18 * 3600 * 1000),
    },
  ];

  let createdAttendance = 0;
  for (const record of attendanceRecords) {
    if (await createAttendanceIfMissing(record)) {
      createdAttendance += 1;
    }
  }
  console.log(`Added ${createdAttendance} attendance records`);

  const horseNames = [
    'Alta Strada', 'Vallee', 'Dejavu', 'Tara', 'Smile Stone', 'Perseus', 'Prada', 'Rodrigo',
    'Zara', 'Fabia', 'Claudia', 'Cadillac', 'Maximus', 'Cesat', 'Pluto', 'Rebelda',
    'Sheeba', 'Fudge', 'Poppy', 'Sil Colman', 'Saraswathi', 'Leon', 'Starlight', 'General',
    'Vadim', 'Campari', 'Marengo', 'Colorado', 'Spirit', 'Transformer', 'Paris', 'Miss Elegance',
    'Cool Nature', 'Caraida', 'Quintina', 'Kara', 'Hobo', 'Successful Dream', 'Knotty Dancer', 'Sonia',
    'Ashley', 'Ziggy', 'Matthieus', 'Ricardo', 'Clara', 'Theo', 'Hugo',
  ];

  for (const horseName of horseNames) {
    await prisma.horse.upsert({
      where: { name: horseName },
      update: {},
      create: {
        name: horseName,
        gender: 'Mare',
        dateOfBirth: new Date(2015, 0, 1),
        breed: 'Thoroughbred',
        age: 9,
        color: 'Bay',
      },
    });
  }
  console.log(`Ensured ${horseNames.length} horses`);

  const groomEmployee = await prisma.employee.findUnique({ where: { email: 'groom@test.com' } });
  const horses = await prisma.horse.findMany({ take: 3 });
  const createdWorksheet = await createGroomWorksheetIfMissing(
    groomEmployee?.id,
    horses,
    new Date()
  );
  console.log(createdWorksheet ? 'Added groom worksheet sample' : 'Skipped groom worksheet sample');

  const managerEmployee = await prisma.employee.findUnique({ where: { email: 'manager@test.com' } });
  if (managerEmployee) {
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
          recordedById: managerEmployee.id,
        },
      });
    }

    console.log(`Ensured ${medicines.length} medicine inventory records`);
  }

  console.log('Database seeding complete');
  console.log('Default test user: admin@test.com / password123');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
