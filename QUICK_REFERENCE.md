# Quick Reference Guide

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend Framework** | Next.js | 14.0+ |
| **Language** | TypeScript | 5.0+ |
| **Database** | PostgreSQL | 12+ |
| **ORM** | Prisma | 5.0+ |
| **Frontend** | React | 18.2+ |
| **State Management** | Context API | - |
| **Routing (Backend)** | Next.js API Routes | - |
| **Routing (Frontend)** | React Router | 6.x |
| **HTTP Client** | Axios | 1.3+ |
| **Authentication** | JWT | - |
| **Image Storage** | AWS S3 | - |

## Development Commands

### Backend
```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database management
npm run prisma:migrate      # Run migrations
npm run prisma:studio       # Open visual database tool
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Run development server (http://localhost:3001)
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Environment Setup

### Backend .env
```env
DATABASE_URL=postgresql://user:password@localhost:5432/stable_management
JWT_SECRET=generate_with_openssl_rand
JWT_EXPIRE=7d
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

### Frontend .env
```env
REACT_APP_API_URL=http://localhost:3000
```

## File Organization

### Backend API Routes
- `/api/auth/*` - Authentication
- `/api/horses/*` - Horse management
- `/api/tasks/*` - Task management
- `/api/employees/*` - Employee management
- `/api/approvals/*` - Approvals
- `/api/health-records/*` - Health records
- `/api/reports/*` - Reports
- `/api/notifications/*` - Notifications
- `/api/audit-logs/*` - Audit logs
- `/api/settings/*` - Settings

### Backend Libraries
- `/lib/prisma.ts` - Database client
- `/lib/auth.ts` - JWT utilities
- `/lib/s3.ts` - AWS S3 utilities
- `/types/index.ts` - TypeScript types

### Database
- `/prisma/schema.prisma` - Database schema
- `/database/migrations/*.sql` - PostgreSQL migrations

## Common Tasks

### Create New API Endpoint
```typescript
// pages/api/users/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = getTokenFromRequest(req as any)
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const users = await prisma.employee.findMany()
    return res.status(200).json({ data: users })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
```

### Query Database with Prisma
```typescript
// Create
const user = await prisma.employee.create({
  data: { email: 'user@example.com', fullName: 'John' }
})

// Read
const users = await prisma.employee.findMany()
const user = await prisma.employee.findUnique({ where: { id: 'emp_123' } })

// Update
await prisma.employee.update({
  where: { id: 'emp_123' },
  data: { fullName: 'Jane' }
})

// Delete
await prisma.employee.delete({ where: { id: 'emp_123' } })
```

### Generate JWT Token
```typescript
import { generateToken } from '@/lib/auth'

const token = generateToken({
  id: 'emp_123',
  email: 'user@example.com',
  designation: 'Groomer'
})
```

### Verify JWT Token
```typescript
import { verifyToken } from '@/lib/auth'

const decoded = verifyToken(token)
if (decoded) {
  console.log(decoded.id, decoded.email)
}
```

## Database Management

### Connect to PostgreSQL
```bash
psql -U username -d stable_management

# Common commands
\dt                   # List tables
\d table_name         # Describe table
\l                    # List databases
\du                   # List users
```

### Run Migrations
```bash
# Create new migration
npm run prisma:migrate -- --name add_field

# Reset database (WARNING: destroys data)
npm run prisma:migrate -- --reset

# Check migration status
npx prisma migrate status
```

## API Usage Examples

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Get Current User
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### List Horses
```bash
curl -X GET "http://localhost:3000/api/horses?skip=0&take=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Grooming",
    "type": "Daily",
    "horseId": "horse_123",
    "assignedEmployeeId": "emp_456",
    "scheduledTime": "2024-01-16T09:00:00Z",
    "priority": "High"
  }'
```

## Roles & Permissions

### Employee Designations
- **Groomer** (Level 0) - Execute tasks, upload evidence
- **Zamindar** (Level 1) - Supervise groomers
- **Instructor** (Level 2) - Approve at higher level
- **Admin** (Level 3) - Full system access
- **Health Advisor** - Manage health records
- **Super Admin** - System configuration

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready -h localhost

# Check connection string format
# postgresql://user:password@localhost:5432/dbname
```

### Port 3000 Already in Use
```bash
# Run on different port
npm run dev -- -p 3001
```

### Prisma Errors
```bash
# Regenerate Prisma client
npm run prisma:generate

# Reset migrations (WARNING: loses data)
npm run prisma:migrate -- --reset
```

### JWT Token Issues
```bash
# Make sure JWT_SECRET is set in .env
# Token expires after JWT_EXPIRE time (default: 7d)
# Include Bearer prefix in Authorization header
```

## Performance Tips

1. **Use Pagination** - Always use skip/take in list endpoints
2. **Index Key Fields** - Already done in Prisma schema
3. **Connection Pooling** - Configure in DATABASE_URL for production
4. **Caching** - Implement Redis for frequently accessed data
5. **Query Optimization** - Use Prisma Studio to analyze queries

## Security Best Practices

1. ✅ JWT tokens with expiration
2. ✅ Password hashing with bcryptjs
3. ✅ SQL injection prevention (Prisma)
4. ✅ CORS configuration
5. ✅ Environment variables for secrets
6. ✅ Role-based access control

## Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [JWT.io](https://jwt.io/)

## Project Contacts & Resources

- **Project Root**: [INDEX.md](./INDEX.md)
- **API Reference**: [API.md](./API.md)
- **Setup Guide**: [SETUP.md](./SETUP.md)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Migration Details**: [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)

---

**Last Updated**: January 2024
**Stack Version**: Next.js 14 + TypeScript + PostgreSQL + Prisma
