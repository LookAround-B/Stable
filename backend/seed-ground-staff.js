const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const groundStaff = [
  { name: 'Rajesh Kumar', designation: 'Ground Supervisor', department: 'Ground Operations' },
  { name: 'Ahmed Hassan', designation: 'Gardener', department: 'Ground Operations' },
  { name: 'Priya Sharma', designation: 'Housekeeping', department: 'Ground Operations' },
  { name: 'Vikram Singh', designation: 'Electrician', department: 'Ground Operations' },
];

async function seedGroundStaff() {
  try {
    console.log(`Adding ${groundStaff.length} ground staff to the database...`);

    for (const staff of groundStaff) {
      const email = staff.name.toLowerCase().replace(/\s+/g, '.') + '@groundstaff.local';
      const hashedPassword = await bcrypt.hash('password123', 10);

      const employee = await prisma.employee.upsert({
        where: { email },
        update: {},
        create: {
          fullName: staff.name,
          email,
          password: hashedPassword,
          designation: staff.designation,
          department: staff.department,
          employmentStatus: 'Active',
          isApproved: true,
        },
      });
      console.log(`✓ Created ${staff.designation}: ${staff.name}`);
    }

    console.log(`\n✅ Successfully added/verified ${groundStaff.length} ground staff!`);
  } catch (error) {
    console.error('Error seeding ground staff:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedGroundStaff();
