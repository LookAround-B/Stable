# Seed Files Status

## ✅ SAFE SEED FILES (Won't crash VPS)

### In `/backend/prisma/`
- ✅ **seed-admin.js** - Creates/updates admin@efm.com account
- ✅ **seed-safe.js** - Main safe seed (employees, horses, etc.)
- ✅ **seed-medicine-safe.js** - Medicine inventory (uses upsert)
- ✅ **seed-medicine-logs-safe.js** - Medicine logs (batched, memory-safe)
- ✅ **check-admin.js** - Verify admin account
- ✅ **check-test-users.js** - Check for test users
- ✅ **check-database-status.js** - Database statistics
- ✅ **delete-test-data.js** - Delete @test.com users
- ✅ **verify-admin.js** - Verify admin password
- ✅ **verify-admin-full.js** - Full admin verification

### In `/backend/seed-data/`
All remaining files are SAFE:
- ✅ **seed-attendance-data.js** - Attendance records (uses upsert)
- ✅ **seed-dp-from-local.js** - Display pictures
- ✅ **seed-eirs-team.js** - EIRS team data
- ✅ **seed-groceries-data.js** - Groceries inventory
- ✅ **seed-groom-data.js** - Groom work data
- ✅ **seed-grooms.js** - Groom employees
- ✅ **seed-ground-staff.js** - Ground staff
- ✅ **seed-horses.js** - Horse data (uses upsert)
- ✅ **seed-medicine-inventory.js** - Medicine inventory

### API Endpoints (still exist but safe)
- ⚠️ **src/pages/api/seed-database.ts** - Creates test users (@test.com)

---

## ❌ DELETED PROBLEMATIC FILES (Were causing VPS crashes)

### Deleted from `/backend/prisma/`
- ❌ **seed.js** - DELETED (loaded 26+ users at once, no batching)
- ❌ **seed-medicine.js** - DELETED (no batching, memory issues)
- ❌ **seed.ts** - DELETED (similar memory issues)

### Deleted from `/backend/seed-data/`
- ❌ **seed-medicine-from-xlsx.js** - DELETED (used deleteMany on medicine data)

### Deleted from `/backend/src/pages/api/`
- ❌ **seed-horses.ts** - DELETED (10+ deleteMany operations, very destructive)

---

## 📝 SAFE NPM COMMANDS

```bash
# Seed general data (employees, horses, etc.)
npm run seed

# Seed medicine inventory
npm run seed:medicine

# Seed medicine logs
npm run seed:medicine-logs

# Create/reset admin account
npm run seed:admin
```

---

## 🚫 WHY FILES WERE PROBLEMATIC

### Memory Issues:
- Your VPS has only **597MB free RAM**
- Old seed files loaded 100+ records simultaneously into memory
- No batching or delays between operations
- Caused memory overflow → VPS crash

### Destructive Operations:
- `deleteMany()` operations wiped out live data
- No checks for existing data before deletion
- Could delete production records

---

## ✅ WHY SAFE FILES ARE SAFE

1. **Use `upsert()`** - Updates if exists, creates if not
2. **Check before creating** - Verify existing records first
3. **Small batches** - Process 5-10 records at a time
4. **Delays** - 100ms delays between batches
5. **Proper cleanup** - Disconnect Prisma after operations
6. **No deleteMany()** - Never delete existing data

---

## 🔐 Admin Credentials

- **Email:** admin@efm.com
- **Password:** password123

---

## 📊 Current Database Status

- 👥 Employees: 72
- 🐴 Horses: 47
- 💊 Medicine Inventory: 15 items
- 💉 Medicine Logs: 20 entries
- 📋 Groom Worksheets: 13

---

**Last Updated:** 2026-04-17
