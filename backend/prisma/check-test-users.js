const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const testUsers = await prisma.employee.findMany({
    where: {
      email: {
        endsWith: '@test.com',
      },
    },
  });

  console.log(`\nFound ${testUsers.length} test users in database:`);
  if (testUsers.length > 0) {
    testUsers.forEach(user => {
      console.log(`   - ${user.fullName} (${user.email})`);
    });
  } else {
    console.log('   ✅ No test users found - all clean!');
  }

  const allUsers = await prisma.employee.count();
  console.log(`\nTotal users in database: ${allUsers}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
