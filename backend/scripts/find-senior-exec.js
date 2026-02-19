const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst({
    where: { designation: 'Senior Executive Accounts' },
    select: { email: true, fullName: true, designation: true }
  });
  
  if (emp) {
    console.log('Senior Executive Accounts Employee:');
    console.log(`Email: ${emp.email}`);
    console.log(`Name: ${emp.fullName}`);
  } else {
    console.log('No Senior Executive Accounts employee found in database');
  }
  
  await prisma.$disconnect();
}

main();
