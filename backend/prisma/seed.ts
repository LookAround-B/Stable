import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with test data...');

  // Note: We do NOT delete all employees anymore to preserve user-created accounts
  // Users can optionally run this to add test accounts without deleting their data

  // Create test users with different roles (using upsert to avoid duplicates)
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

  // Map to store created employees for supervisor relationships
  const createdEmployees: { [key: string]: string } = {};

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
    console.log(`✅ Ensured: ${created.fullName} (${created.email}) - ${created.designation}`);
  }

  // Set up supervisor relationships: Jamedar supervises Groom
  const jamedarId = createdEmployees['jamedar@test.com'];
  const groomEmail = 'groom@test.com';
  
  await prisma.employee.update({
    where: { email: groomEmail },
    data: { supervisorId: jamedarId },
  });
  console.log('✅ Set Jamedar as supervisor of Groom');

  // Seed attendance data for today
  const attendanceDate = new Date();
  attendanceDate.setHours(0, 0, 0, 0);

  const attendanceRecords = [
    { employeeId: (await prisma.employee.findUnique({ where: { email: 'admin@test.com' } }))?.id, status: 'Present', checkInTime: new Date(attendanceDate.getTime() + 5*3600*1000 + 43*60*1000), checkOutTime: new Date(attendanceDate.getTime() + 17*3600*1000 + 40*60*1000) },
    { employeeId: (await prisma.employee.findUnique({ where: { email: 'guard@test.com' } }))?.id, status: 'Present', checkInTime: new Date(attendanceDate.getTime() + 6*3600*1000 + 5*60*1000), checkOutTime: new Date(attendanceDate.getTime() + 18*3600*1000) },
    { employeeId: (await prisma.employee.findUnique({ where: { email: 'groom@test.com' } }))?.id, status: 'Present', checkInTime: new Date(attendanceDate.getTime() + 6*3600*1000), checkOutTime: new Date(attendanceDate.getTime() + 17*3600*1000 + 25*60*1000) },
    { employeeId: (await prisma.employee.findUnique({ where: { email: 'jamedar@test.com' } }))?.id, status: 'Leave' },
    { employeeId: (await prisma.employee.findUnique({ where: { email: 'manager@test.com' } }))?.id, status: 'WOFF' },
    { employeeId: (await prisma.employee.findUnique({ where: { email: 'supervisor@test.com' } }))?.id, status: 'Present', checkInTime: new Date(attendanceDate.getTime() + 5*3600*1000 + 50*60*1000), checkOutTime: new Date(attendanceDate.getTime() + 17*3600*1000 + 45*60*1000) },
    { employeeId: (await prisma.employee.findUnique({ where: { email: 'director@test.com' } }))?.id, status: 'Present', checkInTime: new Date(attendanceDate.getTime() + 7*3600*1000), checkOutTime: new Date(attendanceDate.getTime() + 18*3600*1000) },
  ];

  for (const record of attendanceRecords) {
    if (record.employeeId) {
      await prisma.attendance.create({
        data: {
          employeeId: record.employeeId,
          date: attendanceDate,
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          status: record.status,
        },
      });
    }
  }

  console.log('✅ Seeded attendance records');

  // Seed horses
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
  console.log(`✅ Seeded ${horseNames.length} horses`);

  // Get sample grooms and horses for groom worksheet
  const groomEmployee = await prisma.employee.findUnique({ where: { email: 'groom@test.com' } });
  const horses = await prisma.horse.findMany({ take: 3 });

  if (groomEmployee && horses.length > 0) {
    const worksheetDate = new Date();
    worksheetDate.setHours(0, 0, 0, 0);

    // Create a sample groom worksheet
    await prisma.groomWorkSheet.create({
      data: {
        groomId: groomEmployee.id,
        date: worksheetDate,
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

    console.log('✅ Seeded groom worksheet');
  }


  console.log('\n✅ Database seeding complete!');
  console.log('\n📝 Test Credentials:');
  console.log('   Email: admin@test.com');
  console.log('   Password: password123');
  console.log('\n   Other users: guard@test.com, groom@test.com, etc. (same password)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
