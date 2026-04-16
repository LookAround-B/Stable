const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const groomData = {
  'Ananda T M': [
    { horse: 'Alta Strada', am: 1, pm: 2.5, wd: 3.5, bichali: 10 },
    { horse: 'Vallee', am: 1, pm: 2.5, wd: 3.5, bichali: 10 },
    { horse: 'Dejavu', am: 1, pm: 1.5, wd: 2.5, bichali: 10 },
    { horse: 'Tara', am: 2, pm: 5, wd: 7, woodchips: 1, bichali: 10 },
  ],
  'Pillegowda': [
    { horse: 'Smile Stone', am: 3, pm: 3, wd: 6, woodchips: 1, bichali: 10 },
    { horse: 'Perseus', am: 1, pm: 4, wd: 5, woodchips: 1, bichali: 10 },
    { horse: 'Prada', am: 2, pm: 2.5, wd: 4.5, bichali: 10 },
  ],
  'Sohan Singh': [
    { horse: 'Rodrigo', am: 5, pm: 5, wd: 10, woodchips: 1, bichali: 10 },
    { horse: 'Zara', am: 3, pm: 4, wd: 7, woodchips: 1 },
    { horse: 'Fabia', am: 3, pm: 3, wd: 6, woodchips: 1 },
    { horse: 'Claudia', am: 3, pm: 4.5, wd: 7.5, woodchips: 1, bichali: 10 },
  ],
  'Sunil P': [
    { horse: 'Cadillac', am: 2, pm: 5, wd: 7, woodchips: 1, bichali: 10 },
    { horse: 'Maximus', am: 5, pm: 5, wd: 10, woodchips: 1, bichali: 10 },
    { horse: 'Cesat', am: 3, pm: 5, wd: 8, woodchips: 1 },
    { horse: 'Pluto', am: 1, pm: 6, wd: 7, bichali: 10 },
    { horse: 'Rebelda', am: 1, pm: 2.5, wd: 3.5, bichali: 10 },
  ],
  'Narpat Ram': [
    { horse: 'Sheeba', am: 2, pm: 4, wd: 6, woodchips: 1, boosa: 6 },
    { horse: 'Fudge', am: 2, pm: 3, wd: 5, woodchips: 1, boosa: 6 },
    { horse: 'Poppy', am: 2, pm: 3, wd: 5, woodchips: 1 },
  ],
  'Naveen T P': [
    { horse: 'Sil Colman', am: 1, pm: 2.5, wd: 3.5, bichali: 10 },
    { horse: 'Saraswathi', am: 2, pm: 2.5, wd: 4.5, bichali: 10 },
    { horse: 'Leon', am: 1, pm: 2.5, wd: 3.5, bichali: 10 },
    { horse: 'Starlight', am: 2, pm: 2.5, wd: 4.5, bichali: 10 },
    { horse: 'General', am: 1, pm: 2.5, wd: 3.5, bichali: 10 },
    { horse: 'Vadim', am: 1, pm: 2.5, wd: 3.5, bichali: 10 },
  ],
  'Laxman T R': [
    { horse: 'Campari', am: 1, pm: 4, wd: 5, bichali: 10 },
    { horse: 'Marengo', am: 3, pm: 5, wd: 8, woodchips: 1 },
    { horse: 'Colorado', am: 2, pm: 2.5, wd: 4.5, bichali: 10 },
    { horse: 'Spirit', am: 2, pm: 2.5, wd: 4.5, bichali: 10 },
  ],
  'Khinv Singh': [
    { horse: 'Transformer', am: 1, pm: 2, wd: 3, bichali: 10 },
    { horse: 'Paris', am: 3, pm: 3, wd: 6, woodchips: 1 },
    { horse: 'Miss Elegance', am: 3, pm: 3, wd: 6, bichali: 10 },
  ],
  'Jog Singh': [
    { horse: 'Cool Nature', am: 2, pm: 2.5, wd: 4.5, bichali: 10 },
    { horse: 'Caraida', am: 1, pm: 3, wd: 4, woodchips: 1 },
    { horse: 'Quintina', am: 4, pm: 4, wd: 8, bichali: 10 },
  ],
  'Ashok': [
    { horse: 'Kara', am: 2, pm: 4, wd: 6, woodchips: 1 },
    { horse: 'Hobo', am: 2, pm: 3, wd: 5, bichali: 10 },
    { horse: 'Successful Dream', am: 2, pm: 3.5, wd: 4, bichali: 10 },
    { horse: 'Knotty Dancer', am: 3, pm: 4, wd: 7, bichali: 10 },
  ],
  'Mahesh': [
    { horse: 'Sonia', am: 2, pm: 4.5, wd: 6.5, woodchips: 1, bichali: 10 },
    { horse: 'Ashley', am: 2, pm: 4.5, wd: 6.5, woodchips: 1, bichali: 10 },
    { horse: 'Ziggy', am: 2, pm: 4, wd: 6, woodchips: 1, bichali: 10 },
  ],
  'Bablu': [
    { horse: 'Matthieus', am: 4, pm: 4, wd: 8, woodchips: 1 },
    { horse: 'Ricardo', am: 5, pm: 5, wd: 10, woodchips: 1 },
  ],
  'Raju Singh': [
    { horse: 'Clara', am: 2, pm: 4, wd: 6, woodchips: 1 },
    { horse: 'Theo', am: 4, pm: 4, wd: 8, bichali: 10 },
    { horse: 'Hugo', am: 0, pm: 0, wd: 0 },
  ],
};

async function seedGroomData() {
  try {
    console.log('Starting groom data seed...');

    // Get all grooms (employees with Groom designation)
    const grooms = await prisma.employee.findMany({
      where: {
        designation: 'Groom',
      },
    });

    console.log(`Found ${grooms.length} grooms in database`);

    // Create a map of groom names to IDs
    const groomMap = {};
    grooms.forEach(groom => {
      groomMap[groom.fullName] = groom.id;
    });

    // Get all horses
    const horses = await prisma.horse.findMany();
    const horseMap = {};
    horses.forEach(horse => {
      horseMap[horse.name] = horse.id;
    });

    console.log(`Found ${horses.length} horses in database`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let worksheetCount = 0;
    let entryCount = 0;

    // For each groom, create worksheet entries
    for (const [groomName, entries] of Object.entries(groomData)) {
      const groomId = groomMap[groomName];
      
      if (!groomId) {
        console.warn(`⚠️  Groom not found: ${groomName}`);
        continue;
      }

      // Calculate totals for this groom
      let totalAM = 0;
      let totalPM = 0;
      let totalWoodchips = 0;
      let totalBichali = 0;
      let totalBoosa = 0;

      entries.forEach(entry => {
        totalAM += entry.am || 0;
        totalPM += entry.pm || 0;
        totalWoodchips += entry.woodchips || 0;
        totalBichali += entry.bichali || 0;
        totalBoosa += entry.boosa || 0;
      });

      // Create or update worksheet for today
      const existingWorksheet = await prisma.groomWorkSheet.findFirst({
        where: {
          groomId,
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          },
        },
      });

      let worksheet;
      if (existingWorksheet) {
        worksheet = await prisma.groomWorkSheet.update({
          where: { id: existingWorksheet.id },
          data: {
            totalAM,
            totalPM,
            wholeDayHours: totalAM + totalPM,
            woodchipsUsed: totalWoodchips,
            bichaliUsed: totalBichali,
            booSaUsed: totalBoosa,
          },
        });
      } else {
        worksheet = await prisma.groomWorkSheet.create({
          data: {
            groomId,
            date: today,
            totalAM,
            totalPM,
            wholeDayHours: totalAM + totalPM,
            woodchipsUsed: totalWoodchips,
            bichaliUsed: totalBichali,
            booSaUsed: totalBoosa,
          },
        });
      }

      worksheetCount++;

      // Create worksheet entries
      for (const entry of entries) {
        const horseId = horseMap[entry.horse];
        
        if (!horseId) {
          console.warn(`⚠️  Horse not found: ${entry.horse}`);
          continue;
        }

        // Check if entry already exists
        const existingEntry = await prisma.workSheetEntry.findFirst({
          where: {
            worksheetId: worksheet.id,
            horseId,
          },
        });

        if (!existingEntry) {
          await prisma.workSheetEntry.create({
            data: {
              worksheetId: worksheet.id,
              horseId,
              amHours: entry.am || 0,
              pmHours: entry.pm || 0,
              wholeDayHours: entry.wd || 0,
              woodchipsUsed: entry.woodchips || 0,
              bichaliUsed: entry.bichali || 0,
              booSaUsed: entry.boosa || 0,
            },
          });
        } else {
          await prisma.workSheetEntry.update({
            where: { id: existingEntry.id },
            data: {
              amHours: entry.am || 0,
              pmHours: entry.pm || 0,
              wholeDayHours: entry.wd || 0,
              woodchipsUsed: entry.woodchips || 0,
              bichaliUsed: entry.bichali || 0,
              booSaUsed: entry.boosa || 0,
            },
          });
        }

        entryCount++;
      }

      console.log(`✓ Processed groom: ${groomName} with ${entries.length} horses`);
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Created/Updated: ${worksheetCount} worksheets`);
    console.log(`   Created/Updated: ${entryCount} worksheet entries`);

  } catch (error) {
    console.error('Error seeding groom data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedGroomData();
