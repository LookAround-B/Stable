const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate random alphanumeric stable number (e.g., A12, B7, ST-09)
function generateStableNumber() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const formats = [
    () => letters.charAt(Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 100), // A12
    () => letters.substring(0, 2).split('').map(() => letters.charAt(Math.floor(Math.random() * 26))).join('') + '-' + Math.floor(Math.random() * 100).toString().padStart(2, '0'), // ST-09
    () => letters.charAt(Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 10), // B7
  ];
  const format = formats[Math.floor(Math.random() * formats.length)];
  return format();
}

async function backfillStableNumbers() {
  try {
    console.log('Starting to backfill stable numbers for horses...');

    // Get all horses without stable numbers
    const horsesWithoutStableNumber = await prisma.horse.findMany({
      where: {
        stableNumber: null,
      },
    });

    console.log(`Found ${horsesWithoutStableNumber.length} horses without stable numbers`);

    if (horsesWithoutStableNumber.length === 0) {
      console.log('All horses already have stable numbers!');
      await prisma.$disconnect();
      return;
    }

    // Update each horse with a generated stable number
    for (const horse of horsesWithoutStableNumber) {
      let stableNumber = generateStableNumber();
      
      // Ensure uniqueness by regenerating if it already exists
      let attempts = 0;
      while (
        attempts < 100 &&
        (await prisma.horse.findFirst({
          where: { stableNumber },
        }))
      ) {
        stableNumber = generateStableNumber();
        attempts++;
      }

      if (attempts >= 100) {
        console.warn(`Could not generate unique stable number for horse ${horse.name} after 100 attempts`);
        continue;
      }

      await prisma.horse.update({
        where: { id: horse.id },
        data: { stableNumber },
      });

      console.log(`✓ ${horse.name} -> ${stableNumber}`);
    }

    console.log('\n✅ Backfill complete!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error backfilling stable numbers:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

backfillStableNumbers();
