const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMedicineInventory() {
  try {
    console.log('🏥 Starting medicine inventory seed...');

    // Get a Stable Manager or Jamedar to record the data
    const recorder = await prisma.employee.findFirst({
      where: {
        designation: {
          in: ['Stable Manager', 'Jamedar', 'Super Admin'],
        },
      },
    });

    if (!recorder) {
      console.error('❌ No Stable Manager, Jamedar, or Super Admin found to record medicine inventory');
      process.exit(1);
    }

    console.log(`✓ Recording as: ${recorder.fullName} (${recorder.designation})`);

    // Medicine types and current date info
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const medicineTypes = [
      { type: 'antibiotic', openingStock: 120, unitsPurchased: 50, unit: 'tablets' },
      { type: 'antiseptic', openingStock: 200, unitsPurchased: 100, unit: 'ml' },
      { type: 'painkiller', openingStock: 150, unitsPurchased: 75, unit: 'tablets' },
      { type: 'vitamin', openingStock: 300, unitsPurchased: 150, unit: 'tablets' },
      { type: 'dewormer', openingStock: 80, unitsPurchased: 40, unit: 'tablets' },
      { type: 'injection', openingStock: 60, unitsPurchased: 30, unit: 'vials' },
      { type: 'ointment', openingStock: 90, unitsPurchased: 45, unit: 'g' },
      { type: 'supplement', openingStock: 250, unitsPurchased: 125, unit: 'tablets' },
    ];

    let createdCount = 0;

    for (const medicine of medicineTypes) {
      const existing = await prisma.medicineInventory.findUnique({
        where: {
          medicineType_month_year: {
            medicineType: medicine.type,
            month: currentMonth,
            year: currentYear,
          },
        },
      });

      if (existing) {
        console.log(`⊘ Medicine ${medicine.type} already exists for ${currentMonth}/${currentYear}`);
        continue;
      }

      const record = await prisma.medicineInventory.create({
        data: {
          medicineType: medicine.type,
          month: currentMonth,
          year: currentYear,
          openingStock: medicine.openingStock,
          unitsPurchased: medicine.unitsPurchased,
          unitsLeft: medicine.openingStock + medicine.unitsPurchased,
          unit: medicine.unit,
          recordedById: recorder.id,
          notes: `Monthly stock record for ${medicine.type}`,
        },
      });

      console.log(`✓ Created ${medicine.type}: ${medicine.openingStock} opening + ${medicine.unitsPurchased} purchased (${medicine.unit})`);
      createdCount++;
    }

    console.log(`\n✅ Successfully seeded ${createdCount} medicine inventory records for ${currentMonth}/${currentYear}`);
  } catch (error) {
    console.error('❌ Error seeding medicine inventory:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedMedicineInventory();
