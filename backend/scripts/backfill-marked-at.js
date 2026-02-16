const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backfillMarkedAt() {
  try {
    console.log('Starting to backfill markedAt timestamps...');

    // Find all attendance records without markedAt
    const recordsToUpdate = await prisma.attendance.findMany({
      where: {
        markedAt: null
      }
    });

    console.log(`Found ${recordsToUpdate.length} records to update`);

    if (recordsToUpdate.length === 0) {
      console.log('No records to backfill. All records already have markedAt set.');
      process.exit(0);
    }

    // Update each record with updatedAt value
    let updated = 0;
    for (const record of recordsToUpdate) {
      await prisma.attendance.update({
        where: { id: record.id },
        data: {
          markedAt: record.updatedAt || record.createdAt
        }
      });
      updated++;
    }

    console.log(`✓ Successfully updated ${updated} attendance records with markedAt timestamp`);
    console.log('Backfill complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error backfilling markedAt:', error);
    process.exit(1);
  }
}

backfillMarkedAt();
