# Backend - Stable Management System (Next.js + TypeScript)

This is the backend API server for the Stable Management System, built with Next.js 14 and TypeScript.

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string and other settings

# Create database and run migrations
npm run prisma:migrate

# (Optional) Seed initial data
npm run prisma:db-seed
```

### Running

```bash
# Development server (with hot reload)
npm run dev
# Server runs at http://localhost:3000

# Production build
npm run build
npm start
```

## Project Structure

```
src/
├── pages/api/              # Next.js API routes
│   ├── auth/              # Authentication endpoints
│   ├── horses/            # Horse management
│   ├── tasks/             # Task management
│   ├── employees/         # Employee management
│   ├── approvals/         # Approval workflow
│   ├── health-records/    # Health records
│   ├── reports/           # Reports system
│   ├── notifications/     # Notifications
│   ├── audit-logs/        # Audit logging
│   └── settings/          # System settings
├── lib/
│   ├── prisma.ts          # Prisma Client instance
│   ├── auth.ts            # JWT & auth utilities
│   └── s3.ts              # AWS S3 utilities
└── types/
    └── index.ts           # TypeScript types
prisma/
└── schema.prisma          # Database schema
```

## Key Features

- **Next.js 14** with TypeScript for type-safe API development
- **Prisma ORM** for database operations with PostgreSQL
- **JWT Authentication** with Bearer tokens
- **AWS S3 Integration** for image storage
- **Role-based Access Control** (Admin, Instructor, Zamindar, Groomer, Health Advisor)
- **API Documentation** with request/response examples
- **Error Handling** with proper HTTP status codes
- **Pagination Support** on list endpoints

## API Documentation

Full API documentation is available in `/API.md` in the root directory.

### Key Endpoints

- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET/POST /api/horses` - Manage horses
- `GET/POST /api/tasks` - Manage tasks
- `GET/POST /api/employees` - Manage employees
- `GET/POST /api/approvals` - Handle approvals
- `GET /api/notifications` - Get notifications
- `GET /api/audit-logs` - View audit logs

## Database

### PostgreSQL Connection

Update your `.env` file with:
```
DATABASE_URL=postgresql://username:password@localhost:5432/stable_management
```

### Migrations

```bash
# Create new migration
npm run prisma:migrate -- --name migration_name

# View migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npm run prisma:migrate -- --reset
```

### Prisma Studio

Visual database management tool:
```bash
npm run prisma:studio
# Opens at http://localhost:5555
```

## Environment Variables

See `.env.example` for all available configuration options:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `JWT_EXPIRE` | Token expiration time |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 |
| `AWS_REGION` | AWS region (e.g., us-east-1) |
| `AWS_S3_BUCKET` | S3 bucket name for images |
| `NODE_ENV` | Environment (development/production) |
| `NEXT_PUBLIC_API_URL` | Public API URL |
| `FRONTEND_URL` | Frontend application URL |

## Authentication

### JWT Token Flow

1. User submits email to `POST /api/auth/login`
2. Backend creates or retrieves user
3. JWT token generated with user info
4. Token sent to frontend
5. Frontend includes token in all requests: `Authorization: Bearer <token>`
6. Backend verifies token in middleware

### Token Structure

```json
{
  "id": "emp_123",
  "email": "user@example.com",
  "designation": "Groomer",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## Development Tips

### TypeScript

All files use TypeScript for type safety:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Your handler code
}
```

### Database Queries

Using Prisma:

```typescript
import prisma from '@/lib/prisma'

// Create
const horse = await prisma.horse.create({
  data: { name: 'Thunder', gender: 'Male' }
})

// Read
const horses = await prisma.horse.findMany()

// Update
await prisma.horse.update({
  where: { id: 'horse_123' },
  data: { status: 'Active' }
})

// Delete
await prisma.horse.delete({ where: { id: 'horse_123' } })
```

### Error Handling

Consistent error response format:

```typescript
// Success
return res.status(200).json({ data: result })

// Bad request
return res.status(400).json({ error: 'Missing required fields' })

// Unauthorized
return res.status(401).json({ error: 'Unauthorized' })

// Server error
return res.status(500).json({ error: 'Internal server error' })
```

## Testing

(To be implemented with Jest)

```bash
npm test
```

## Deployment

### Vercel (Recommended for Next.js)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Self-Hosted (Docker)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U username -d stable_management -h localhost

# Check connection string format
# postgresql://username:password@host:port/database
```

### Port Already in Use

```bash
# Run on different port
npm run dev -- -p 3001
```

### Prisma Migration Errors

```bash
# Check migration status
npx prisma migrate status

# Reset (WARNING: loses data)
npm run prisma:migrate -- --reset
```

## Contributing

1. Create a feature branch
2. Implement changes with TypeScript types
3. Test with Prisma Studio
4. Submit pull request

## Support

For issues or questions, refer to:
- API Documentation: [API.md](../API.md)
- Architecture: [ARCHITECTURE.md](../ARCHITECTURE.md)
- Setup Guide: [SETUP.md](../SETUP.md)
