const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('Deleting all InstructorDailyWorkRecord records...');
    const result = await prisma.instructorDailyWorkRecord.deleteMany({});
    console.log(`✓ Deleted ${result.count} records`);
  } catch (error) {
    console.error('Error deleting records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
