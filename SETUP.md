# Development Setup Guide

## Prerequisites Installation

### 1. Install Node.js
Download from https://nodejs.org/ (LTS version recommended)
Verify installation:
```bash
node --version
npm --version
```

### 2. Install PostgreSQL
Download from https://www.postgresql.org/download/
Create superuser and remember the password
Verify installation:
```bash
psql --version
psql -U postgres  # Test connection
```

### 3. AWS S3 Setup
- Create AWS account
- Create S3 bucket for images
- Create IAM user with S3 access
- Copy Access Key ID and Secret Access Key

## Backend Setup (Next.js + TypeScript + PostgreSQL)

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your PostgreSQL configuration
# Important variables:
# - DATABASE_URL=postgresql://username:password@localhost:5432/stable_management
# - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
# - JWT_SECRET (generate a random string: openssl rand -base64 32)

# Generate Prisma Client
npm run prisma:generate

# Create database and run migrations
npm run prisma:migrate

# (Optional) Seed initial data
psql -U postgres -d stable_management -f ../database/migrations/seed.sql

# Start development server
npm run dev
# Backend will be available at http://localhost:3000
```

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with backend API URL
# REACT_APP_API_URL=http://localhost:3000

# Start development server
npm start
# Frontend will be available at http://localhost:3001
```

## Database Setup (PostgreSQL)

### Create Database
```bash
# Connect to PostgreSQL as admin
psql -U postgres

# Create new database
CREATE DATABASE stable_management;

# Connect to the new database
\c stable_management

# (Optional) Create dedicated user
CREATE USER stable_user WITH PASSWORD 'your_password';
ALTER ROLE stable_user WITH createdb createrole;
GRANT ALL PRIVILEGES ON DATABASE stable_management TO stable_user;

# Exit psql
\q
```

### Initialize Schema with Prisma
```bash
cd backend

# This creates all tables, indexes, and constraints
npm run prisma:migrate

# View database in Prisma Studio
npm run prisma:studio
```

## Environment Configuration

### Backend .env file template:
```env
# PostgreSQL Database
DATABASE_URL=postgresql://username:password@localhost:5432/stable_management

# JWT Configuration
JWT_SECRET=your_generated_secret_key_here
JWT_EXPIRE=7d

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=stable-management-bucket

# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### Frontend .env file template:
```env
REACT_APP_API_URL=http://localhost:3000
```

## Running the Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
# Runs on http://localhost:3000
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
# Runs on http://localhost:3001
```

## Useful Commands

### Backend
```bash
# Development
npm run dev

# Production build
npm build
npm start

# Prisma utilities
npm run prisma:migrate   # Create/apply migrations
npm run prisma:generate  # Generate Prisma Client
npm run prisma:studio    # Open Prisma Studio (Visual DB viewer)
```

### Database Management
```bash
# Connect to database
psql -U stable_user -d stable_management

# Common PostgreSQL commands
\dt                  # List tables
\d table_name        # Describe table
\l                   # List databases
\du                  # List users
```

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL service is running
sudo systemctl status postgresql  # Linux
brew services list               # macOS

# Check connection string format
# postgresql://username:password@host:port/database
```

### Prisma Migration Issues
```bash
# Reset database (WARNING: deletes all data)
npm run prisma:migrate -- --reset

# View migration status
npx prisma migrate status
```

### Port Already in Use
```bash
# Change Next.js port
npm run dev -- -p 3001

# Change React port
PORT=3002 npm start
```
```

Server will run on http://localhost:5000

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env if needed
# Default: REACT_APP_API_URL=http://localhost:5000/api

# Start development server
npm start
```

App will run on http://localhost:3000

## Database Setup

### Create Database
```bash
mysql -u root -p
CREATE DATABASE stable_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Initialize Schema
```bash
mysql -u root -p stable_management < database/schema.sql
mysql -u root -p stable_management < database/seed.sql
```

### Verify Tables
```bash
mysql -u root -p stable_management
SHOW TABLES;
```

## Testing the Application

### Test Backend API
```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test horses endpoint
curl -X GET http://localhost:5000/api/horses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Frontend
Navigate to http://localhost:3000 in your browser
- Login with an email address
- Complete profile setup
- Explore dashboard and features

## Common Issues & Solutions

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306

# Ensure MySQL is running:
# Windows: Services panel or use:
net start MySQL80

# Mac/Linux:
sudo systemctl start mysql
```

### Missing Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### JWT Token Issues
```
Error: Invalid or expired token

# Ensure JWT_SECRET is set in .env
# Regenerate new token with fresh login
```

## Useful Commands

### Backend
```bash
npm run dev        # Start development server with hot reload
npm start          # Start production server
npm test           # Run tests
```

### Frontend
```bash
npm start          # Start development server
npm build          # Build for production
npm test           # Run tests
npm eject          # Eject from create-react-app (irreversible)
```

### Database
```bash
# Backup database
mysqldump -u root -p stable_management > backup.sql

# Restore database
mysql -u root -p stable_management < backup.sql

# Reset database
mysql -u root -p
DROP DATABASE stable_management;
CREATE DATABASE stable_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Environment Variables Reference

### Backend .env
```
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=stable_management
DB_PORT=3306

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=stable-management-bucket

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### Frontend .env
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
```

## Next Steps

1. Review the README.md for project overview
2. Check the database schema in database/schema.sql
3. Explore the API routes structure in backend/src/routes
4. Review React components in frontend/src/components
5. Start implementing business logic in controllers
6. Add more detailed frontend components as needed
