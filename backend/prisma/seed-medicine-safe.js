const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// ❌ Block seeding in production
const env = process.env.NODE_ENV;
if (env === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  console.error('🚫 Seeding is NOT allowed in production (NODE_ENV=production).');
  process.exit(1);
}

console.log(`🌱 Running medicine seed in [${env || 'development'}] environment...`);

const prisma = new PrismaClient();

const MEDICINES = [
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

async function main() {
  console.log('Ensuring medicine inventory defaults...');

  const manager =
    await prisma.employee.findFirst({
      where: { designation: 'Stable Manager' },
      select: { id: true, fullName: true },
    }) ||
    await prisma.employee.findFirst({
      where: { designation: { in: ['Super Admin', 'Director', 'School Administrator'] } },
      select: { id: true, fullName: true },
    });

  if (!manager) {
    throw new Error('No suitable employee found to own seeded medicine inventory records.');
  }

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  for (const med of MEDICINES) {
    await prisma.medicineInventory.upsert({
      where: {
        medicineType_month_year: {
          medicineType: med.medicineType,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {
        unit: med.unit,
        threshold: med.threshold,
        notes: med.notes,
        openingStock: med.openingStock,
        unitsPurchased: med.unitsPurchased,
        totalUsed: med.totalUsed,
        unitsLeft: med.unitsLeft,
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
        recordedById: manager.id,
      },
    });
  }

  console.log(`Ensured ${MEDICINES.length} medicine inventory records for ${currentMonth}/${currentYear}`);
}

main()
  .catch((error) => {
    console.error('Medicine inventory seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
