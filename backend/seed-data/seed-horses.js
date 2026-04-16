const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const horses = [
  'Alta Strada',
  'Vallee',
  'Dejavu',
  'Tara',
  'Smile Stone',
  'Perseus',
  'Prada',
  'Rodrigo',
  'Zara',
  'Fabia',
  'Claudia',
  'Cadillac',
  'Maximus',
  'Cesat',
  'Pluto',
  'Rebelda',
  'Sheeba',
  'Fudge',
  'Poppy',
  'Sil Colman',
  'Saraswathi',
  'Leon',
  'Starlight',
  'General',
  'Vadim',
  'Campari',
  'Marengo',
  'Colorado',
  'Spirit',
  'Transformer',
  'Paris',
  'Miss Elegance',
  'Cool Nature',
  'Caraida',
  'Quintina',
  'Kara',
  'Hobo',
  'Successful Dream',
  'Knotty Dancer',
  'Sonia',
  'Ashley',
  'Ziggy',
  'Matthieus',
  'Ricardo',
  'Clara',
  'Theo',
  'Hugo',
];

async function seedHorses() {
  try {
    console.log(`Adding ${horses.length} horses to the database...`);

    let count = 0;
    for (const horseName of horses) {
      const horse = await prisma.horse.upsert({
        where: { name: horseName },
        update: {},
        create: {
          name: horseName,
          gender: 'Mare',
          dateOfBirth: new Date(2015, 0, 1),
          breed: 'Thoroughbred',
          age: 9,
          color: 'Bay',
        },
      });
      count++;
    }

    console.log(`✅ Successfully added/verified ${count} horses!`);
  } catch (error) {
    console.error('Error seeding horses:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedHorses();
