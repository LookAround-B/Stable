const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const testUsers = [
  // Leadership Department
  { email: 'admin@test.com', fullName: 'Admin User', designation: 'Super Admin', department: 'Leadership', phoneNumber: '555-0001', shiftTiming: null },
  { email: 'director@test.com', fullName: 'Dr. Director', designation: 'Director', department: 'Leadership', phoneNumber: '555-0002', shiftTiming: null },
  { email: 'school-admin@test.com', fullName: 'School Administrator', designation: 'School Administrator', department: 'Leadership', phoneNumber: '555-0003', shiftTiming: null },

  // Stable Operations Department
  { email: 'manager@test.com', fullName: 'Emma Manager', designation: 'Stable Manager', department: 'Stable Operations', phoneNumber: '555-0004', shiftTiming: null },
  { email: 'instructor@test.com', fullName: 'James Instructor', designation: 'Instructor', department: 'Stable Operations', phoneNumber: '555-0005', shiftTiming: null },
  { email: 'jamedar@test.com', fullName: 'Raj Jamedar', designation: 'Jamedar', department: 'Stable Operations', phoneNumber: '555-0006', shiftTiming: null },
  { email: 'jamedar2@test.com', fullName: 'Anand Jamedar', designation: 'Jamedar', department: 'Stable Operations', phoneNumber: '555-0006b', shiftTiming: null },
  { email: 'groom@test.com', fullName: 'Sarah Groom', designation: 'Groom', department: 'Stable Operations', phoneNumber: '555-0007', shiftTiming: null },
  { email: 'groom2@test.com', fullName: 'Michael Groom', designation: 'Groom', department: 'Stable Operations', phoneNumber: '555-0007b', shiftTiming: null },
  { email: 'riding-boy@test.com', fullName: 'Tommy Riding Boy', designation: 'Riding Boy', department: 'Stable Operations', phoneNumber: '555-0008', shiftTiming: null },
  { email: 'rider@test.com', fullName: 'Alex Rider', designation: 'Rider', department: 'Stable Operations', phoneNumber: '555-0009', shiftTiming: null },
  { email: 'farrier@test.com', fullName: 'Mike Farrier', designation: 'Farrier', department: 'Stable Operations', phoneNumber: '555-0010', shiftTiming: null },

  // Ground Operations Department
  { email: 'ground-supervisor@test.com', fullName: 'Mike Supervisor', designation: 'Ground Supervisor', department: 'Ground Operations', phoneNumber: '555-0011', shiftTiming: null },
  { email: 'guard@test.com', fullName: 'John Guard', designation: 'Guard', department: 'Ground Operations', phoneNumber: '555-0012', shiftTiming: 'Morning' },
  { email: 'guard2@test.com', fullName: 'David Guard', designation: 'Guard', department: 'Ground Operations', phoneNumber: '555-0013', shiftTiming: 'Evening' },
  { email: 'electrician@test.com', fullName: 'Robert Electrician', designation: 'Electrician', department: 'Ground Operations', phoneNumber: '555-0014', shiftTiming: 'Day' },
  { email: 'gardener@test.com', fullName: 'Peter Gardener', designation: 'Gardener', department: 'Ground Operations', phoneNumber: '555-0015', shiftTiming: null },
  { email: 'housekeeping@test.com', fullName: 'Lisa Housekeeping', designation: 'Housekeeping', department: 'Ground Operations', phoneNumber: '555-0016', shiftTiming: null },

  // Restaurant Operations Department
  { email: 'restaurant-manager@test.com', fullName: 'Marco Restaurant Manager', designation: 'Restaurant Manager', department: 'Restaurant Operations', phoneNumber: '555-0016b', shiftTiming: null },
  { email: 'kitchen-helper@test.com', fullName: 'Tony Kitchen Helper', designation: 'Kitchen Helper', department: 'Restaurant Operations', phoneNumber: '555-0016c', shiftTiming: null },
  { email: 'waiter@test.com', fullName: 'Giovanni Waiter', designation: 'Waiter', department: 'Restaurant Operations', phoneNumber: '555-0016d', shiftTiming: null },

  // Accounts/Administration Department
  { email: 'senior-exec-admin@test.com', fullName: 'Rachel Senior Executive Admin', designation: 'Senior Executive Admin', department: 'Accounts/Administration', phoneNumber: '555-0017', shiftTiming: null },
  { email: 'junior-exec-admin@test.com', fullName: 'Kevin Junior Executive Admin', designation: 'Junior Executive Admin', department: 'Accounts/Administration', phoneNumber: '555-0017b', shiftTiming: null },
  { email: 'senior-accounts@test.com', fullName: 'Patricia Senior Accounts', designation: 'Senior Executive - Accounts', department: 'Accounts/Administration', phoneNumber: '555-0018', shiftTiming: null },
  { email: 'executive-accounts@test.com', fullName: 'Charles Executive Accounts', designation: 'Executive Accounts', department: 'Accounts/Administration', phoneNumber: '555-0019', shiftTiming: null },
  { email: 'executive-admin@test.com', fullName: 'Susan Executive Admin', designation: 'Executive Admin', department: 'Accounts/Administration', phoneNumber: '555-0020', shiftTiming: null },
];

async function seedTestAccounts() {
  const hash = await bcrypt.hash('password123', 10);
  let created = 0, updated = 0;

  for (const user of testUsers) {
    const result = await prisma.employee.upsert({
      where: { email: user.email },
      update: { password: hash },
      create: {
        fullName: user.fullName,
        email: user.email,
        password: hash,
        designation: user.designation,
        department: user.department,
        phoneNumber: user.phoneNumber,
        shiftTiming: user.shiftTiming,
        employmentStatus: 'Active',
        isApproved: true,
      },
    });
    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) { created++; console.log(`✓ Created: ${user.fullName} (${user.email})`); }
    else { updated++; console.log(`✏ Updated: ${user.fullName} (${user.email})`); }
  }

  console.log(`\n✅ Done! Created: ${created}, Updated: ${updated}`);
  console.log('All test accounts use password: password123');
  await prisma.$disconnect();
}

seedTestAccounts();
