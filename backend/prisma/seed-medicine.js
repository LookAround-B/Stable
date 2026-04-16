const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('💊 Seeding Medicine Data...\n');

  // Get required employees
  const manager = await prisma.employee.findFirst({
    where: { designation: 'Stable Manager' },
  });

  const jamiedars = await prisma.employee.findMany({
    where: { designation: 'Jamedar' },
  });

  if (!manager) {
    console.error('❌ No Stable Manager found. Please run the main seed first.');
    process.exit(1);
  }

  if (jamiedars.length === 0) {
    console.error('❌ No Jamiedars found. Please run the main seed first.');
    process.exit(1);
  }

  // Get horses
  const horses = await prisma.horse.findMany();

  if (horses.length === 0) {
    console.error('❌ No horses found. Please run the main seed first.');
    process.exit(1);
  }

  // Clear existing medicine data
  console.log('🗑️  Clearing existing medicine data...');
  await prisma.medicineLog.deleteMany({});
  await prisma.medicineInventory.deleteMany({});

  // Seed Medicine Inventory
  console.log('\n📦 Seeding Medicine Inventory...');
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
    await prisma.medicineInventory.create({
      data: {
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
        recordedById: manager.id,
      },
    });
  }

  console.log(`✅ Seeded ${medicines.length} medicine inventory records`);

  // Seed Medicine Logs
  console.log('\n💉 Seeding Medicine Logs...');

  const medicineLogEntries = [
    { medicineName: 'Phenylbutazone (Bute)', quantity: 2, unit: 'tablets', notes: 'Post-exercise anti-inflammatory treatment', approvalStatus: 'approved' },
    { medicineName: 'Banamine (Flunixin)', quantity: 5, unit: 'ml', notes: 'Administered for mild colic symptoms', approvalStatus: 'approved' },
    { medicineName: 'Gastrogard (Omeprazole)', quantity: 1, unit: 'tube', notes: 'Ulcer prevention during competition season', approvalStatus: 'approved' },
    { medicineName: 'Eqvalan (Ivermectin Paste)', quantity: 1, unit: 'syringe', notes: 'Quarterly deworming schedule', approvalStatus: 'approved' },
    { medicineName: 'Adequan (PSGAG)', quantity: 1, unit: 'injection', notes: 'Joint maintenance therapy - series dose 3 of 7', approvalStatus: 'pending' },
    { medicineName: 'Legend (Hyaluronate Sodium)', quantity: 4, unit: 'ml', notes: 'IV joint therapy for stiffness', approvalStatus: 'approved' },
    { medicineName: 'Dexamethasone', quantity: 10, unit: 'ml', notes: 'Anti-inflammatory for swollen fetlock', approvalStatus: 'pending' },
    { medicineName: 'SMZ-TMP (Sulfamethoxazole)', quantity: 20, unit: 'tablets', notes: 'Respiratory infection treatment - day 3 of 7', approvalStatus: 'approved' },
    { medicineName: 'Equioxx (Firocoxib)', quantity: 1, unit: 'tube', notes: 'Daily osteoarthritis management', approvalStatus: 'approved' },
    { medicineName: 'Panacur (Fenbendazole)', quantity: 1, unit: 'tube', notes: 'Five-day fenbendazole course - day 1', approvalStatus: 'pending' },
    { medicineName: 'Pentosan Equine (Cartrophen)', quantity: 3, unit: 'ml', notes: 'Weekly joint injection series', approvalStatus: 'approved' },
    { medicineName: 'Excede (Ceftiofur)', quantity: 1, unit: 'injection', notes: 'Antibiotic for hoof abscess', approvalStatus: 'approved' },
    { medicineName: 'Vetalog (Triamcinolone)', quantity: 6, unit: 'mg', notes: 'Intra-articular injection left hock', approvalStatus: 'pending' },
    { medicineName: 'Regumate (Altrenogest)', quantity: 10, unit: 'ml', notes: 'Mare cycle suppression for training', approvalStatus: 'approved' },
    { medicineName: 'Osphos (Clodronate)', quantity: 9, unit: 'ml', notes: 'Navicular treatment protocol', approvalStatus: 'approved' },
  ];

  for (let i = 0; i < medicineLogEntries.length; i++) {
    const entry = medicineLogEntries[i];
    const horse = horses[i % horses.length];
    const jamedar = jamiedars[i % jamiedars.length];

    // Create varied timestamps over the past 14 days
    const daysAgo = Math.floor(i / 2);
    const hoursOffset = 6 + (i % 12); // Between 6 AM and 6 PM
    const adminTime = new Date();
    adminTime.setDate(adminTime.getDate() - daysAgo);
    adminTime.setHours(hoursOffset, Math.floor(Math.random() * 60), 0, 0);

    await prisma.medicineLog.create({
      data: {
        jamiedarId: jamedar.id,
        horseId: horse.id,
        medicineName: entry.medicineName,
        quantity: entry.quantity,
        unit: entry.unit,
        timeAdministered: adminTime,
        notes: entry.notes,
        approvalStatus: entry.approvalStatus,
        approvedById: entry.approvalStatus === 'approved' ? manager.id : null,
        approvalDate: entry.approvalStatus === 'approved' ? adminTime : null,
      },
    });

    console.log(`   💊 ${entry.medicineName} → ${horse.name} (${entry.approvalStatus})`);
  }

  console.log(`\n✅ Seeded ${medicineLogEntries.length} medicine log records`);

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Medicine Inventory: ${medicines.length} items`);
  console.log(`   Medicine Logs: ${medicineLogEntries.length} entries`);
  console.log(`   Approved: ${medicineLogEntries.filter(e => e.approvalStatus === 'approved').length}`);
  console.log(`   Pending: ${medicineLogEntries.filter(e => e.approvalStatus === 'pending').length}`);

  console.log('\n✅ Medicine seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
