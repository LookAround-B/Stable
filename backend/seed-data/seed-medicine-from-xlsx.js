const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data from Medical inventory.xlsx
const inventoryData = [
  { name: "Surgical Spirit (4.5 ltr)", quantity: "4.5ltr", openingStock: 1, available: 1 },
  { name: "Liquid Praffin", quantity: "5 ltr", openingStock: 1, available: 1 },
  { name: "Ectopar", quantity: "1ltr", openingStock: 3, available: 3 },
  { name: "Sulphur Powder", quantity: "400g", openingStock: 4, available: 4 },
  { name: "Copper Sulphate", quantity: "400g", openingStock: 3, available: 3 },
  { name: "Sodium Corbonate", quantity: "400g", openingStock: 1, available: 1 },
  { name: "Potassuim Citrate", quantity: "400g", openingStock: 5, available: 5 },
  { name: "Sodium Citrate", quantity: "400g", openingStock: 1, available: 1 },
  { name: "Cantinea Powder", quantity: "100g", openingStock: 4, available: 4 },
  { name: "Sulphatrin", quantity: "100g", openingStock: 5, available: 5 },
  { name: "Sallaki Oil", quantity: "30ml", openingStock: 3, available: 3 },
  { name: "Dimethyl Sulphate solution", quantity: "500ml", openingStock: 2, available: 2 },
  { name: "Ascabiol", quantity: "120ml", openingStock: 2, available: 2 },
  { name: "Oil Turpentile", quantity: "400ml", openingStock: 2, available: 2 },
  { name: "Candid Powder", quantity: "100g", openingStock: 2, available: 2 },
  { name: "Notix Powder", quantity: "100g", openingStock: 2, available: 2 },
  { name: "Hydrogen Pyraxide Solution", quantity: "400ml", openingStock: 4, available: 4 },
  { name: "Povidone Iodine", quantity: "500ml", openingStock: 1, available: 1 },
  { name: "Keto chlor", quantity: "200ml", openingStock: 2, available: 2 },
  { name: "Gloves", quantity: "100 units", openingStock: 2, available: 2 },
  { name: "Syringe 50ml", quantity: "50ml", openingStock: 46, available: 46 },
  { name: "Syringe 2ml", quantity: "2ml", openingStock: 74, available: 74 },
  { name: "Syringe 5ml", quantity: "5ml", openingStock: 97, available: 97 },
  { name: "Syringe 10ml", quantity: "10ml", openingStock: 133, available: 133 },
  { name: "Syringe 20ml", quantity: "20ml", openingStock: 31, available: 31 },
  { name: "IV Set", quantity: "Units", openingStock: 17, available: 17 },
  { name: "Astymine", quantity: "500ml", openingStock: 13, available: 13 },
  { name: "NS.045 Sodium Chloride", quantity: "500ml", openingStock: 34, available: 34 },
  { name: "Roller Bandage", quantity: "Pcs", openingStock: 71, available: 71 },
  { name: "Cotton Bandage", quantity: "Pcs", openingStock: 7, available: 7 },
  { name: "Bereline Injection", quantity: "90ml", openingStock: 2, available: 2 },
  { name: "Heamo Injection", quantity: "100ml", openingStock: 1, available: 1 },
  { name: "Catosal Injection", quantity: "100ml", openingStock: 4, available: 4 },
  { name: "Vitamin B 12 Injection", quantity: "100ml", openingStock: 1, available: 1 },
  { name: "Floxidine Injection", quantity: "100ml", openingStock: 2, available: 2 },
  { name: "Tonophosphane Injection", quantity: "100ml", openingStock: 2, available: 2 },
  { name: "Steclin Injection", quantity: "100ml", openingStock: 3, available: 3 },
  { name: "Neutroxin Injection", quantity: "100ml", openingStock: 1, available: 1 },
  { name: "Pentazone Injection", quantity: "100ml", openingStock: 2, available: 2 },
  { name: "ACP Injection", quantity: "100ml", openingStock: 1, available: 1 },
  { name: "19*1 1/2 Needles", quantity: "Pcs", openingStock: 171, available: 171 },
  { name: "21*1 1/2 Needles", quantity: "Pcs", openingStock: 150, available: 150 },
  { name: "23*1 Needles", quantity: "Pcs", openingStock: 41, available: 41 },
  { name: "26*1 1/2 Needles", quantity: "Pcs", openingStock: 192, available: 192 },
  { name: "16*1 1/2 Needles", quantity: "Pcs", openingStock: 3, available: 3 },
  { name: "21*1 Needles", quantity: "Pcs", openingStock: 10, available: 10 },
  { name: "26*1/2 Needles", quantity: "Pcs", openingStock: 69, available: 69 },
  { name: "BD Polymouth Needles", quantity: "Pcs", openingStock: 228, available: 228 },
  { name: "BD Vacutainer Yellow cap", quantity: "Pcs", openingStock: 91, available: 91 },
  { name: "BD Vacutainer White cap", quantity: "Pcs", openingStock: 4, available: 4 },
  { name: "BD Vacutainer Red cap", quantity: "Pcs", openingStock: 34, available: 34 },
  { name: "BD Vacutainer Puple cap", quantity: "Pcs", openingStock: 40, available: 40 },
  { name: "BD Vacutainer Indigo/Lavendar cap", quantity: "Pcs", openingStock: 18, available: 18 },
  { name: "Blood Test tubes", quantity: "Pcs", openingStock: 4, available: 4 },
  { name: "Swap test", quantity: "Pcs", openingStock: 4, available: 4 },
  { name: "Ciplox Injection (Ciprobid)", quantity: "100ml", openingStock: 4, available: 4 },
  { name: "Oriphim Injection", quantity: "30ml", openingStock: 5, available: 5 },
  { name: "Thromophob ointment", quantity: "20g", openingStock: 1, available: 1 },
  { name: "Matris Injection", quantity: "100ml", openingStock: 6, available: 6 },
  { name: "IV Cannula", quantity: "Units", openingStock: 34, available: 34 },
  { name: "Xylazine", quantity: "30ml", openingStock: 5, available: 5 },
  { name: "Duvadilan", quantity: "2ml", openingStock: 102, available: 102 },
  { name: "Flunxine", quantity: "20ml", openingStock: 7, available: 7 },
  { name: "Nebasulph", quantity: "20ml", openingStock: 5, available: 5 },
  { name: "Vetalog Injection", quantity: "5ml", openingStock: 7, available: 7 },
  { name: "Lubrex Eye drops", quantity: "Pcs", openingStock: 1, available: 1 },
  { name: "Sterile water", quantity: "10ml", openingStock: 37, available: 37 },
  { name: "Ciplox D eye drops", quantity: "Pcs", openingStock: 2, available: 2 },
  { name: "Atropine Eye drops", quantity: "5ml", openingStock: 3, available: 3 },
  { name: "Ocupol Eye Ointment", quantity: "5g", openingStock: 1, available: 1 },
  { name: "Toba Eye drops", quantity: "5ml", openingStock: 1, available: 1 },
  { name: "Avilin Injection", quantity: "33ml", openingStock: 13, available: 13 },
  { name: "Gentamicin Injection", quantity: "100ml", openingStock: 4, available: 4 },
  { name: "Butodol", quantity: "1ml", openingStock: 60, available: 60 },
  { name: "Lox", quantity: "30ml", openingStock: 40, available: 40 },
  { name: "Vetalgin", quantity: "33ml", openingStock: 13, available: 13 },
  { name: "Rantic", quantity: "30ml", openingStock: 23, available: 23 },
  { name: "Artizone", quantity: "100ml", openingStock: 5, available: 5 },
  { name: "Fortifie Penicilin Injection", quantity: "3g", openingStock: 23, available: 23 },
  { name: "Benzyle penicilin Injection", quantity: "3g", openingStock: 6, available: 6 },
  { name: "Sodium Bycarbonte", quantity: "25ml", openingStock: 16, available: 16 },
  { name: "Mucomix", quantity: "5ml", openingStock: 35, available: 35 },
  { name: "Combivit Injection", quantity: "30ml", openingStock: 6, available: 6 },
  { name: "Stradren Injection", quantity: "10ml", openingStock: 1, available: 1 },
  { name: "Imizet Injection", quantity: "10ml", openingStock: 3, available: 3 },
  { name: "Dexamethasone Injection", quantity: "30ml", openingStock: 6, available: 6 },
  { name: "Busco pan Injection", quantity: "1ml", openingStock: 60, available: 60 },
  { name: "ALU spray", quantity: "25ml", openingStock: 3, available: 3 },
  { name: "Kiskin Cream", quantity: "20g", openingStock: 11, available: 11 },
  { name: "Calendula", quantity: "25g", openingStock: 6, available: 6 },
  { name: "Himax", quantity: "50g", openingStock: 2, available: 2 },
  { name: "Fernin", quantity: "1ml", openingStock: 10, available: 10 },
  { name: "Tropine", quantity: "1ml", openingStock: 50, available: 50 },
  { name: "Anikate", quantity: "5ml", openingStock: 24, available: 24 },
  { name: "RL", quantity: "1000 ltr", openingStock: 24, available: 24 },
  { name: "NS 1000ml", quantity: "1000 ltr", openingStock: 60, available: 60 },
  { name: "NS 500ml", quantity: "500 ltr", openingStock: 24, available: 24 },
];

// Parse unit from quantity string
function parseUnit(qty) {
  if (!qty) return 'units';
  const q = qty.toLowerCase().trim();
  if (q.includes('ltr') || q.includes('liter')) return 'ltr';
  if (q.includes('ml')) return 'ml';
  if (q.includes('g') && !q.includes('unit')) return 'g';
  if (q.includes('pcs') || q.includes('unit')) return 'units';
  return 'units';
}

// Categorize medicine type
function categorize(name) {
  const n = name.toLowerCase();
  if (n.includes('injection')) return 'injection';
  if (n.includes('eye drop') || n.includes('eye ointment')) return 'eye_care';
  if (n.includes('ointment') || n.includes('cream') || n.includes('spray')) return 'ointment';
  if (n.includes('powder')) return 'powder';
  if (n.includes('needle') || n.includes('syringe') || n.includes('cannula') || n.includes('iv set') || n.includes('bandage') || n.includes('gloves') || n.includes('vacutainer') || n.includes('test tube') || n.includes('swap')) return 'supplies';
  if (n.includes('oil') || n.includes('spirit') || n.includes('solution') || n.includes('iodine') || n.includes('chlor') || n.includes('water')) return 'antiseptic';
  return 'general';
}

async function seed() {
  try {
    // Find admin user for recordedById
    const admin = await prisma.employee.findFirst({ where: { email: 'admin@test.com' } });
    if (!admin) { console.error('Admin user not found!'); return; }
    console.log('Using admin:', admin.id, admin.fullName);

    // Find jamedar for medicine logs
    const jamedar = await prisma.employee.findFirst({ where: { email: 'jamedar2@test.com' } });
    if (!jamedar) { console.error('Jamedar2 not found!'); return; }
    console.log('Using jamedar:', jamedar.id, jamedar.fullName);

    // Get horses for medicine logs
    const horses = await prisma.horse.findMany({ select: { id: true, name: true } });
    console.log('Found', horses.length, 'horses');

    const now = new Date();
    const month = now.getMonth() + 1; // Current month
    const year = now.getFullYear();

    // Clear existing data
    console.log('\nClearing existing medicine inventory...');
    await prisma.medicineInventory.deleteMany({});
    console.log('Clearing existing medicine logs...');
    await prisma.medicineLog.deleteMany({});

    // Seed Medicine Inventory
    console.log('\nSeeding Medicine Inventory...');
    let inventoryCount = 0;
    for (const item of inventoryData) {
      const unit = parseUnit(item.quantity);
      await prisma.medicineInventory.create({
        data: {
          medicineType: item.name,
          month: month,
          year: year,
          openingStock: item.openingStock,
          unitsPurchased: 0,
          totalUsed: 0,
          unitsLeft: item.available,
          unit: unit,
          notes: `Quantity: ${item.quantity}`,
          threshold: Math.max(1, Math.floor(item.available * 0.2)),
          notifyAdmin: item.available <= 2,
          recordedById: admin.id,
        }
      });
      inventoryCount++;
    }
    console.log(`Created ${inventoryCount} medicine inventory records`);

    // Seed Medicine Logs - create some sample logs for various horses
    console.log('\nSeeding Medicine Logs...');
    const sampleMedicines = [
      { name: "Povidone Iodine", qty: 10, unit: "ml", notes: "Wound cleaning" },
      { name: "Surgical Spirit (4.5 ltr)", qty: 20, unit: "ml", notes: "Disinfection" },
      { name: "Vitamin B 12 Injection", qty: 5, unit: "ml", notes: "Monthly supplement" },
      { name: "Catosal Injection", qty: 10, unit: "ml", notes: "Energy booster" },
      { name: "Floxidine Injection", qty: 15, unit: "ml", notes: "Antibiotic treatment" },
      { name: "Dexamethasone Injection", qty: 5, unit: "ml", notes: "Anti-inflammatory" },
      { name: "Vetalgin", qty: 10, unit: "ml", notes: "Pain relief" },
      { name: "Gentamicin Injection", qty: 8, unit: "ml", notes: "Bacterial infection" },
      { name: "Ciplox D eye drops", qty: 2, unit: "ml", notes: "Eye treatment" },
      { name: "Busco pan Injection", qty: 1, unit: "ml", notes: "Colic treatment" },
      { name: "Nebasulph", qty: 5, unit: "ml", notes: "Wound treatment" },
      { name: "Xylazine", qty: 3, unit: "ml", notes: "Sedation for treatment" },
      { name: "Ectopar", qty: 50, unit: "ml", notes: "Tick treatment" },
      { name: "Hydrogen Pyraxide Solution", qty: 30, unit: "ml", notes: "Wound cleaning" },
      { name: "ALU spray", qty: 5, unit: "ml", notes: "Wound spray" },
    ];

    let logCount = 0;
    const statuses = ['approved', 'approved', 'approved', 'pending', 'approved'];

    for (let i = 0; i < Math.min(horses.length, 15); i++) {
      const horse = horses[i];
      const med = sampleMedicines[i % sampleMedicines.length];
      const daysAgo = Math.floor(Math.random() * 30);
      const timeAdministered = new Date(now);
      timeAdministered.setDate(timeAdministered.getDate() - daysAgo);
      timeAdministered.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

      const status = statuses[i % statuses.length];

      await prisma.medicineLog.create({
        data: {
          jamiedarId: jamedar.id,
          horseId: horse.id,
          medicineName: med.name,
          quantity: med.qty,
          unit: med.unit,
          timeAdministered: timeAdministered,
          notes: med.notes,
          approvalStatus: status,
          approvedById: status === 'approved' ? admin.id : null,
          approvalDate: status === 'approved' ? timeAdministered : null,
        }
      });
      logCount++;
    }
    console.log(`Created ${logCount} medicine log records`);

    console.log('\nSeeding complete!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
