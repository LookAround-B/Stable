const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Get all employees
  const allEmps = await prisma.employee.findMany({
    select: { email: true, fullName: true, designation: true },
  });
  
  console.log('All Employees in Database:');
  console.log('='.repeat(60));
  
  if (allEmps.length === 0) {
    console.log('No employees found');
  } else {
    allEmps.forEach(emp => {
      console.log(`Email: ${emp.email}`);
      console.log(`Name: ${emp.fullName}`);
      console.log(`Role: ${emp.designation}`);
      console.log('-'.repeat(60));
    });
  }
  
  console.log(`\nTotal Employees: ${allEmps.length}`);
  
  await prisma.$disconnect();
}

main();
