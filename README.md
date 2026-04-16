
---

# Stable Management System

A comprehensive enterprise-grade web application for equestrian facility management, featuring hierarchical task management, real-time operations tracking, and comprehensive horse care coordination.
 <div align="center">
  <img src="frontend/public/fav.png" alt="Stable Management System Logo" width="120" height="120">
</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14_|_16-black?style=flat-square&logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-5.8-2D3748?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-06B6D4?style=flat-square&logo=tailwindcss)

</div>

## Features

- **Hierarchical Task Management**: Multi-level approval workflows with automated escalation
- **Horse Care Management**: Complete health records, care teams, and veterinary tracking
- **Employee Operations**: Attendance tracking, permissions, and performance monitoring
- **Inventory Control**: Feed, medicine, tack, and equipment management
- **Financial Management**: Expense tracking, fines, and automated billing
- **Security & Access**: Gate management, visitor logging, and audit trails
- **Real-time Notifications**: Automated alerts and escalation systems
- **Analytics & Reporting**: Operational insights and compliance reporting

## Tech Stack

**Backend**: Next.js 16, TypeScript, PostgreSQL, Prisma ORM, JWT Authentication
**Frontend**: React 19, Radix UI, Tailwind CSS, React Router
**Infrastructure**: AWS S3, Redis, Google OAuth

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- AWS S3 account
- Google OAuth credentials

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   npm run install-all
   ```

2. **Configure environment:**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env

   # Edit .env files with your credentials
   ```

3. **Setup database:**
   ```bash
   cd backend
   npm run prisma:migrate
   npm run seed
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   npm run start-backend

   # Terminal 2 - Frontend
   npm run start-frontend
   ```

Visit `http://localhost:3001` to access the application.


## Development

### Available Scripts

- `npm run install-all` - Install all dependencies
- `npm run start-backend` - Start backend server
- `npm run start-frontend` - Start frontend application
- `npm run build-frontend` - Build for production

### Environment Variables

**Backend (.env):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `AWS_ACCESS_KEY_ID` - AWS S3 access key

**Frontend (.env):**
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_GOOGLE_CLIENT_ID` - Google OAuth client ID

## Security

- JWT-based authentication with secure token management
- Role-based access control with granular permissions
- AWS S3 secure file storage with access controls
- Comprehensive audit logging and compliance tracking
- Data encryption and secure API endpoints

## Performance

- Optimized database queries with strategic indexing
- Redis caching for improved response times
- Image compression and efficient file handling
- Real-time notifications with WebSocket support
- Mobile-responsive design with progressive enhancement

## License

Proprietary - Stable Management System

## Support

For technical support or questions, please contact the development team.

