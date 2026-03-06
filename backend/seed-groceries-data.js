/**
 * Seed script: Grocery Inventory 2026 (March 3rd data)
 * Run: node seed-groceries-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 109 grocery items from the Excel — "Grocery Inventory 2026.xlsx" → Sheet "March 2026"
// Date: 3rd March 2026, parsed quantities/units
const GROCERY_ITEMS = [
  { name: "Ajwain", quantity: 100, unit: "g" },
  { name: "Almond", quantity: 500, unit: "g" },
  { name: "Appalam", quantity: 3, unit: "packets" },
  { name: "Ashirvad Atta", quantity: 5, unit: "kg" },
  { name: "Assam tea powder", quantity: 250, unit: "g" },
  { name: "Basmati Rice", quantity: 1.5, unit: "kg" },
  { name: "Black Elachi", quantity: 50, unit: "g" },
  { name: "Black elachi", quantity: 50, unit: "g" },
  { name: "Bombay Briyani Mixed Masala", quantity: 120, unit: "g" },
  { name: "BRU coffe powder", quantity: 500, unit: "g" },
  { name: "Butter", quantity: 1.5, unit: "kg" },
  { name: "Cashew", quantity: 200, unit: "g" },
  { name: "Channa", quantity: 500, unit: "g" },
  { name: "Channa dal", quantity: 200, unit: "g" },
  { name: "Chat Masala", quantity: 90, unit: "g" },
  { name: "Cheese", quantity: 1, unit: "kg" },
  { name: "Chilli powder", quantity: 250, unit: "g" },
  { name: "Chocolate Syrup", quantity: 600, unit: "g" },
  { name: "Cinnamon", quantity: 50, unit: "g" },
  { name: "Clove", quantity: 20, unit: "g" },
  { name: "Coco powder", quantity: 100, unit: "g" },
  { name: "Coconut", quantity: 2, unit: "pcs" },
  { name: "Coconut Milk", quantity: 200, unit: "ml" },
  { name: "Custard Powder", quantity: 100, unit: "g" },
  { name: "Daniya", quantity: 50, unit: "g" },
  { name: "Daniya Seeds", quantity: 500, unit: "g" },
  { name: "Dark chocolate", quantity: 1, unit: "kg" },
  { name: "Dark Soya Sauce", quantity: 750, unit: "g" },
  { name: "DM olives oil", quantity: 900, unit: "g" },
  { name: "DM Penne (500g)", quantity: 5, unit: "packets" },
  { name: "Dm spaghetti (500g)", quantity: 9, unit: "packets" },
  { name: "Drinking hot chocolate", quantity: 500, unit: "g" },
  { name: "Dry Basil", quantity: 14, unit: "g" },
  { name: "Dry Chilli", quantity: 250, unit: "g" },
  { name: "Eggless Mayonase", quantity: 1, unit: "kg" },
  { name: "Eggs", quantity: 180, unit: "pcs" },
  { name: "Everest Chat Masala", quantity: 450, unit: "g" },
  { name: "Everest Chicken Masala", quantity: 650, unit: "g" },
  { name: "Everest Garam masala", quantity: 100, unit: "g" },
  { name: "Everest Kitchen king masala", quantity: 200, unit: "g" },
  { name: "Everest Masala", quantity: 100, unit: "g" },
  { name: "Everest Tandoori Chicken masala", quantity: 200, unit: "g" },
  { name: "Fresh cream", quantity: 30, unit: "kg" },
  { name: "Glass Cleaner", quantity: 2, unit: "ltr" },
  { name: "Gram dal", quantity: 400, unit: "g" },
  { name: "Gram Flour", quantity: 100, unit: "g" },
  { name: "Green moong", quantity: 500, unit: "g" },
  { name: "Guest Rice", quantity: 3, unit: "kg" },
  { name: "Instant Dry yeast", quantity: 200, unit: "g" },
  { name: "Jaggary", quantity: 200, unit: "g" },
  { name: "Jeera", quantity: 300, unit: "g" },
  { name: "Kissan Jam Mixed fruit", quantity: 1, unit: "kg" },
  { name: "Kitchen towels", quantity: 14, unit: "pcs" },
  { name: "Lemon", quantity: 140, unit: "pcs" },
  { name: "Light meat Tuna", quantity: 185, unit: "g" },
  { name: "Light soya bean Sauce", quantity: 730, unit: "g" },
  { name: "Maida", quantity: 5, unit: "kg" },
  { name: "Mapel Syrup", quantity: 500, unit: "g" },
  { name: "Masoor Dal", quantity: 1, unit: "kg" },
  { name: "Mixes herbs", quantity: 14, unit: "g" },
  { name: "Mr. muscel Cleaner", quantity: 450, unit: "ml" },
  { name: "MTR Gulab jamun (175g)", quantity: 3, unit: "packets" },
  { name: "MTR puliogare", quantity: 200, unit: "g" },
  { name: "Mustard", quantity: 50, unit: "g" },
  { name: "Nuetella", quantity: 750, unit: "g" },
  { name: "Onion", quantity: 10, unit: "kg" },
  { name: "Onion powder", quantity: 50, unit: "g" },
  { name: "Origano", quantity: 100, unit: "g" },
  { name: "Peanut", quantity: 500, unit: "g" },
  { name: "Peanut butter", quantity: 924, unit: "g" },
  { name: "Pepper nut", quantity: 50, unit: "g" },
  { name: "Peri peri Sprinkler", quantity: 90, unit: "g" },
  { name: "Pizza Seasoning", quantity: 45, unit: "g" },
  { name: "Potato", quantity: 2, unit: "kg" },
  { name: "Puha (500g)", quantity: 3, unit: "packets" },
  { name: "Raisins", quantity: 100, unit: "g" },
  { name: "Rava", quantity: 1.5, unit: "kg" },
  { name: "Rava (Alt)", quantity: 1, unit: "kg" },
  { name: "Rice", quantity: 8, unit: "kg" },
  { name: "Rock salt", quantity: 2, unit: "kg" },
  { name: "Saajeera", quantity: 200, unit: "g" },
  { name: "Salt", quantity: 2, unit: "kg" },
  { name: "Sambar Powder", quantity: 50, unit: "g" },
  { name: "Sandwich Breads", quantity: 16, unit: "packs" },
  { name: "Sindhi Briyani Mixed Masala", quantity: 60, unit: "g" },
  { name: "Souf", quantity: 100, unit: "g" },
  { name: "Soya chunks", quantity: 1, unit: "kg" },
  { name: "Star Flower", quantity: 250, unit: "g" },
  { name: "Stone Flower", quantity: 50, unit: "g" },
  { name: "Straws", quantity: 2, unit: "packs" },
  { name: "Sugar", quantity: 5, unit: "kg" },
  { name: "Synthetic Vinegar", quantity: 750, unit: "ml" },
  { name: "Tamarind", quantity: 50, unit: "g" },
  { name: "Tango Mango", quantity: 500, unit: "g" },
  { name: "Tango Orange", quantity: 500, unit: "g" },
  { name: "Tata tea powder", quantity: 500, unit: "g" },
  { name: "Tea powder", quantity: 500, unit: "g" },
  { name: "Tissue", quantity: 16, unit: "packs" },
  { name: "Tomato chilli ketchup (900g)", quantity: 2, unit: "units" },
  { name: "Tomato Fury", quantity: 200, unit: "ml" },
  { name: "Toor dal", quantity: 1, unit: "kg" },
  { name: "Turmeric", quantity: 100, unit: "g" },
  { name: "Urad dal", quantity: 200, unit: "g" },
  { name: "Venilla essel", quantity: 50, unit: "g" },
  { name: "Vim gel", quantity: 1, unit: "ltr" },
  { name: "Vim Soap", quantity: 1, unit: "units" },
  { name: "Walnut Kernels", quantity: 150, unit: "g" },
  { name: "Yellow moong dal", quantity: 1, unit: "kg" },
  { name: "Zandu Honey", quantity: 1, unit: "kg" },
];

const PURCHASE_DATE = new Date('2026-03-03');

async function main() {
  console.log('🛒 Starting Grocery Inventory seed...\n');

  // Find a suitable admin user to be createdById
  const adminUser = await prisma.employee.findFirst({
    where: {
      designation: {
        in: ['Senior Executive Admin', 'Junior Executive Admin', 'Restaurant Manager', 'Super Admin', 'Director', 'School Administrator'],
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!adminUser) {
    // Fall back to any employee
    const anyUser = await prisma.employee.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!anyUser) {
      console.error('❌ No employees found in the database. Please seed employees first.');
      process.exit(1);
    }
    console.log(`⚠️  No admin user found. Using: ${anyUser.fullName} (${anyUser.designation})`);
    return seedItems(anyUser.id);
  }

  console.log(`✅ Using admin: ${adminUser.fullName} (${adminUser.designation})\n`);
  await seedItems(adminUser.id);
}

async function seedItems(createdById) {
  let created = 0;
  let skipped = 0;

  for (const item of GROCERY_ITEMS) {
    try {
      // Check if already exists for this date to avoid duplicates
      const existing = await prisma.groceriesInventory.findFirst({
        where: {
          name: { equals: item.name, mode: 'insensitive' },
          purchaseDate: PURCHASE_DATE,
        },
      });

      if (existing) {
        console.log(`  ⏭  Skipped (exists): ${item.name}`);
        skipped++;
        continue;
      }

      await prisma.groceriesInventory.create({
        data: {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: 0,
          totalPrice: 0,
          purchaseDate: PURCHASE_DATE,
          createdById,
        },
      });
      console.log(`  ✅ Created: ${item.name} — ${item.quantity} ${item.unit}`);
      created++;
    } catch (err) {
      console.error(`  ❌ Error creating ${item.name}:`, err.message);
    }
  }

  console.log(`\n📊 Done! Created: ${created}, Skipped: ${skipped}, Total: ${GROCERY_ITEMS.length}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
