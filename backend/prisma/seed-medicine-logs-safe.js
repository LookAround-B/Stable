const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Small batch size to avoid memory issues
const BATCH_SIZE = 5;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('💊 Seeding medicine logs safely (memory-friendly)...\n');

  // Find managers/jamadars (not test users)
  const managers = await prisma.employee.findMany({
    where: {
      designation: {
        in: ['Stable Manager', 'Jamedar', 'Director', 'Super Admin'],
      },
      email: {
        not: { endsWith: '@test.com' },
      },
    },
    take: 3,
  });

  if (managers.length === 0) {
    console.log('⚠️  No suitable managers/jamadars found.');
    return;
  }

  // Get horses
  const horses = await prisma.horse.findMany({
    take: 15, // Limit to prevent memory issues
  });

  if (horses.length === 0) {
    console.log('⚠️  No horses found.');
    return;
  }

  console.log(`Found ${managers.length} managers and ${horses.length} horses\n`);

  const medicines = [
    { name: 'Phenylbutazone (Bute)', unit: 'tablets', qty: 2 },
    { name: 'Banamine (Flunixin)', unit: 'ml', qty: 5 },
    { name: 'Gastrogard (Omeprazole)', unit: 'tube', qty: 1 },
    { name: 'Eqvalan (Ivermectin Paste)', unit: 'syringe', qty: 1 },
    { name: 'Adequan (PSGAG)', unit: 'injection', qty: 1 },
    { name: 'Legend (Hyaluronate Sodium)', unit: 'ml', qty: 4 },
    { name: 'Dexamethasone', unit: 'ml', qty: 10 },
    { name: 'SMZ-TMP (Sulfamethoxazole)', unit: 'tablets', qty: 20 },
    { name: 'Equioxx (Firocoxib)', unit: 'tube', qty: 1 },
    { name: 'Panacur (Fenbendazole)', unit: 'tube', qty: 1 },
  ];

  let created = 0;

  // Process in small batches
  for (let i = 0; i < Math.min(medicines.length, 10); i++) {
    const medicine = medicines[i];
    const horse = horses[i % horses.length];
    const manager = managers[i % managers.length];

    // Create timestamp
    const adminTime = new Date();
    adminTime.setDate(adminTime.getDate() - i);
    adminTime.setHours(8 + i, 0, 0, 0);

    // Check if exists
    const exists = await prisma.medicineLog.findFirst({
      where: {
        horseId: horse.id,
        medicineName: medicine.name,
        timeAdministered: adminTime,
      },
    });

    if (!exists) {
      await prisma.medicineLog.create({
        data: {
          jamiedarId: manager.id,
          horseId: horse.id,
          medicineName: medicine.name,
          quantity: medicine.qty,
          unit: medicine.unit,
          timeAdministered: adminTime,
          notes: `Administered ${medicine.name} to ${horse.name}`,
          approvalStatus: i % 3 === 0 ? 'pending' : 'approved',
          approvedById: i % 3 === 0 ? null : manager.id,
          approvalDate: i % 3 === 0 ? null : adminTime,
        },
      });

      created++;
      console.log(`   ✅ ${medicine.name} → ${horse.name}`);

      // Small delay to avoid overwhelming the database
      if (i % BATCH_SIZE === 0) {
        await sleep(100);
      }
    }
  }

  console.log(`\n✅ Created ${created} medicine log entries\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
