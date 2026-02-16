const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    const records = await prisma.attendance.findMany({
      take: 5,
      select: {
        id: true,
        employeeId: true,
        status: true,
        remarks: true,
        markedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('Sample attendance records:');
    records.forEach(record => {
      console.log(`\nID: ${record.id}`);
      console.log(`Status: ${record.status}`);
      console.log(`MarkedAt: ${record.markedAt}`);
      console.log(`CreatedAt: ${record.createdAt}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
