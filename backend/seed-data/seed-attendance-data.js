const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const attendanceData = [
  { name: 'Anand Kumar M', checkIn: '05:43', checkOut: '17:40', status: 'WOFF' },
  { name: 'Ananda T M', checkIn: '06:05', checkOut: null, status: 'WOFF' },
  { name: 'Ashoka T C', checkIn: '06:00', checkOut: '17:25', status: 'Present' },
  { name: 'Jhumar Ram', checkIn: '05:28', checkOut: '17:45', status: 'Present' },
  { name: 'Laxman T R', checkIn: '05:50', checkOut: null, status: 'WOFF' },
  { name: 'Lokesh T M', checkIn: '06:05', checkOut: '18:00', status: 'Present' },
  { name: 'Mahesh R', checkIn: '05:54', checkOut: '17:40', status: 'Present' },
  { name: 'Marappa', checkIn: '05:30', checkOut: '17:40', status: 'Present' },
  { name: 'Nagaraj T M', checkIn: null, checkOut: '17:18', status: 'Absent' },
  { name: 'Narayanaswamy', checkIn: '05:20', checkOut: '17:30', status: 'Present' },
  { name: 'Naveen T P', checkIn: '06:08', checkOut: '18:10', status: 'Present' },
  { name: 'Patalappa T K', checkIn: null, checkOut: '17:53', status: 'WOFF' },
  { name: 'Patela', checkIn: '06:04', checkOut: null, status: 'Present' },
  { name: 'Pillegowda', checkIn: '05:58', checkOut: '17:53', status: 'Present' },
  { name: 'Sarwan Das', checkIn: null, checkOut: null, status: 'Leave' },
  { name: 'Sohan Singh', checkIn: '05:00', checkOut: '16:57', status: 'Present' },
  { name: 'Sunil T P', checkIn: null, checkOut: '17:55', status: 'WOFF' },
  { name: 'Venkatesh T V', checkIn: '06:03', checkOut: '18:05', status: 'Present' },
  { name: 'Bhawani Singh', checkIn: null, checkOut: null, status: 'Absent' },
  { name: 'Vittu Kumar', checkIn: null, checkOut: null, status: 'WOFF' },
  { name: 'Khinv Singh', checkIn: null, checkOut: null, status: 'Absent' },
  { name: 'Mahendra Singh', checkIn: null, checkOut: '17:25', status: 'Leave' },
  { name: 'Raju Singh', checkIn: '05:58', checkOut: '17:19', status: 'Present' },
  { name: 'Jog Singh', checkIn: '04:55', checkOut: '16:57', status: 'Present' },
  { name: 'Megh Singh', checkIn: '05:35', checkOut: '17:25', status: 'Present' },
  { name: 'Syed Sahim Pasha', checkIn: null, checkOut: null, status: 'Leave', remark: 'Lumbini' },
  { name: 'Soubhag Singh', checkIn: '06:00', checkOut: '17:25', status: 'Present' },
  { name: 'Soubhag Singh (Nursery Room)', checkIn: '05:40', checkOut: '17:25', status: 'Present' },
];

function timeToDate(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
}

async function seedAttendance() {
  try {
    console.log(`Adding ${attendanceData.length} attendance records...`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let employeeCount = 0;
    let attendanceCount = 0;

    for (const record of attendanceData) {
      // Create or get employee
      const email = record.name.toLowerCase().replace(/\s+/g, '.') + '@grooms.local';
      const hashedPassword = await bcrypt.hash('password123', 10);

      const employee = await prisma.employee.upsert({
        where: { email },
        update: {},
        create: {
          fullName: record.name,
          email,
          password: hashedPassword,
          designation: 'Groom',
          department: 'Stable Operations',
          employmentStatus: 'Active',
          isApproved: true,
        },
      });

      if (!employee) {
        console.warn(`⚠️  Could not create employee: ${record.name}`);
        continue;
      }

      employeeCount++;

      // Create or update attendance record
      const checkInTime = record.checkIn ? timeToDate(record.checkIn) : null;
      const checkOutTime = record.checkOut ? timeToDate(record.checkOut) : null;

      const attendance = await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: today,
          },
        },
        update: {
          checkInTime,
          checkOutTime,
          status: record.status,
          remarks: record.remark || null,
        },
        create: {
          employeeId: employee.id,
          date: today,
          checkInTime,
          checkOutTime,
          status: record.status,
          remarks: record.remark || null,
        },
      });

      attendanceCount++;
      console.log(`✓ ${record.name} - ${record.status}`);
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Created/Updated: ${employeeCount} employees`);
    console.log(`   Created: ${attendanceCount} attendance records`);
  } catch (error) {
    console.error('Error seeding attendance:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAttendance();
