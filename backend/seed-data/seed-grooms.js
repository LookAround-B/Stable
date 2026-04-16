const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const grooms = [
  'Ananda T M',
  'Pillegowda',
  'Sohan Singh',
  'Sunil P',
  'Narpat Ram',
  'Naveen T P',
  'Laxman T R',
  'Khinv Singh',
  'Jog Singh',
  'Ashok',
  'Mahesh',
  'Bablu',
  'Raju Singh',
];

async function seedGrooms() {
  try {
    console.log(`Adding ${grooms.length} grooms to the database...`);

    let count = 0;
    for (const groomName of grooms) {
      // Create an email from the name
      const email = groomName.toLowerCase().replace(/\s+/g, '.') + '@grooms.local';
      const hashedPassword = await bcrypt.hash('password123', 10);

      const employee = await prisma.employee.upsert({
        where: { email },
        update: {},
        create: {
          fullName: groomName,
          email,
          password: hashedPassword,
          designation: 'Groom',
          department: 'Stable Operations',
          employmentStatus: 'Active',
          isApproved: true,
        },
      });
      count++;
      console.log(`✓ Created groom: ${groomName}`);
    }

    console.log(`\n✅ Successfully added/verified ${count} grooms!`);
  } catch (error) {
    console.error('Error seeding grooms:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedGrooms();
