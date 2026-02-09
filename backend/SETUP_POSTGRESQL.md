# Backend Setup - Current Status ✅

## What's Been Done ✅

1. ✅ **Dependencies Installed**
   - Next.js 14
   - TypeScript 5
   - Prisma 5
   - All required packages

2. ✅ **Prisma Client Generated**
   - Type-safe database access ready
   - Located in: `node_modules/@prisma/client`

3. ✅ **Environment File Created**
   - File: `.env` (configured)
   - JWT_SECRET configured for development
   - Database URL template set

## Next Steps - PostgreSQL Setup

You need to install and configure PostgreSQL before running migrations.

### Option 1: Install PostgreSQL Locally (Recommended for Development)

**Windows Installation:**

1. Download PostgreSQL 14+ from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. **Remember the password you set for the `postgres` user** (important!)
4. During installation, keep port as `5432` (default)
5. Install pgAdmin (recommended, it's included in the installer)

**After Installation:**
- PostgreSQL service should start automatically
- Test the connection:
  ```bash
  psql -U postgres
  # You should be prompted for password
  # Type: postgres (or whatever password you set)
  ```

### Option 2: Use Windows Subsystem for Linux (WSL)

If you have WSL2 installed:
```bash
# In WSL terminal:
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

### Option 3: Docker (if Docker is installed)

```bash
docker run --name stable_management_db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=stable_management \
  -p 5432:5432 \
  -d postgres:15
```

## Create the Database

Once PostgreSQL is running:

```bash
# Connect as admin
psql -U postgres

# Create the database
CREATE DATABASE stable_management;

# Exit psql
\q
```

Or in one command:
```bash
createdb -U postgres stable_management
```

## Run Migrations

After PostgreSQL and database are set up:

```bash
# From the backend directory
npx prisma migrate deploy

# Or create migrations interactively:
npx prisma migrate dev
```

## Verify Setup

```bash
# View the database in Prisma Studio
npx prisma studio

# Or verify with psql
psql -U postgres -d stable_management -c "\dt"
```

## Environment Variables - Update if Needed

If your PostgreSQL password is different, update `.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/stable_management
```

## Start Development Server

Once database is ready:

```bash
npm run dev
# Backend runs at http://localhost:3000
```

## Quick Troubleshooting

### "psql not found"
- PostgreSQL not installed or not in PATH
- Add PostgreSQL bin directory to PATH:
  - Typically: `C:\Program Files\PostgreSQL\15\bin`

### "Connection refused"
- PostgreSQL service not running
- Windows: Start PostgreSQL service from Services app
- Linux: `sudo service postgresql start`

### "FATAL: role 'postgres' does not exist"
- Create the role: `createuser -U postgres postgres`

### "database stable_management does not exist"
- Create it: `createdb -U postgres stable_management`

---

**Once PostgreSQL is installed and running, return here and run:**
```bash
npx prisma migrate deploy
npm run dev
```

**Need help? Check:**
- [PostgreSQL Installation Guide](https://www.postgresql.org/docs/current/admin.html)
- [Prisma Database Setup](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch)
- [SETUP.md](../SETUP.md) in the project root
