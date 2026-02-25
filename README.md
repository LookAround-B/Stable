# Stable Management System

A comprehensive web application for managing horses, employees, and daily stable operations with hierarchical task management, real-time status updates, and accountability through an approval chain structure.

## Project Overview

This system implements:
- **4-level hierarchical approval system** (Groomer → Zamindar → Instructor → Admin)
- **Horse management** with comprehensive health records and care tracking
- **Employee management** with role-based access control
- **Task management** with photographic evidence and timestamps
- **Report system** for accountability and violations
- **Real-time notifications** and approval escalation

## System Architecture

### Tech Stack

**Backend:**
- Next.js 14+ (TypeScript)
- PostgreSQL database with Prisma ORM
- JWT authentication
- AWS S3 for image storage

**Frontend:**
- React 18+
- React Router for navigation
- Axios for API calls
- CSS3 for responsive design

**Database:**
- PostgreSQL 12+
- Prisma ORM for type-safe database access

## Project Structure

```
horsestable/
├── backend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── api/              # Next.js API routes
│   │   │       ├── auth/         # Authentication endpoints
│   │   │       ├── horses/       # Horse management endpoints
│   │   │       ├── tasks/        # Task management endpoints
│   │   │       ├── employees/    # Employee management endpoints
│   │   │       ├── approvals/    # Approval endpoints
│   │   │       ├── health-records/ # Health record endpoints
│   │   │       ├── reports/      # Report endpoints
│   │   │       ├── notifications/ # Notification endpoints
│   │   │       ├── audit-logs/   # Audit logging endpoints
│   │   │       └── settings/     # System settings endpoints
│   │   ├── lib/
│   │   │   ├── prisma.ts         # Prisma client initialization
│   │   │   ├── auth.ts           # JWT utilities
│   │   │   └── s3.ts             # AWS S3 utilities
│   │   └── types/
│   │       └── index.ts          # TypeScript type definitions
│   ├── prisma/
│   │   └── schema.prisma         # Prisma schema for PostgreSQL
│   ├── tsconfig.json             # TypeScript configuration
│   ├── next.config.js            # Next.js configuration
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable React components
│   │   ├── pages/                # Page components
│   │   ├── services/             # API service layer
│   │   ├── context/              # React context providers
│   │   ├── styles/               # CSS files
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── .env.example
│
└── database/
    ├── migrations/
    │   ├── 001_initial_schema.sql # PostgreSQL schema
    │   └── seed.sql              # Initial seed data
```

## Core Entities

### 1. Employees
Hierarchical roles:
- **Groomer (Level 0)**: Execute tasks, upload proof, view assigned horses
- **Zamindar (Level 1)**: Supervise groomers, approve/reject tasks
- **Instructor (Level 2)**: View all activities, approve/reject at higher level
- **Admin (Level 3)**: Full system access, create tasks, manage employees
- **Health Advisor**: Manage horse health records

### 2. Horses
Comprehensive horse records including:
- Basic info: name, gender, breed, color, height, location
- Measurements: girth, bit, rug, bridle, nummah sizes
- Identification: UELN, microchip, FEI ID, passport
- Pedigree: sire and damsire information
- Ownership: owner details, lease status, insurance
- Status: active/rest/injured/traveling
- Health records and medical history

### 3. Tasks
- Task types: Daily, Weekly, Event-based
- States: Pending → In Progress → Completed → Approved
- Approval chain follows employee hierarchy
- Auto-expiry after X minutes
- Photographic proof and questionnaire support

### 4. Approvals
- Follows approval chain: Zamindar → Instructor → Admin
- SLA-based escalation (auto-escalate if not approved within timeframe)
- Marks non-responsive approvers as NO_RESPONSE
- Supports partial approvals with notes

### 5. Reports
- Employee can report violations/misconduct
- Tagged @ mentions system
- Evidence with images and timestamps
- Visible to supervisory chain and admins
- Status: Open, Resolved, Dismissed

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- AWS S3 account (for image storage)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your database and AWS credentials

5. Create database and run migrations:
```bash
npm run prisma:migrate
```

6. (Optional) Seed initial data:
```bash
npm run seed
```

6. Start the server:
```bash
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm start
```

App runs on `http://localhost:3000`

## Cross-Platform Setup (Windows + Linux)

To avoid line-ending conflicts and editor formatting issues across OSes:

1. Ensure Git respects LF line endings in this repo:
```bash
git config core.autocrlf input
```

2. Keep the new repo settings that normalize line endings and whitespace:
- `.gitattributes` enforces LF line endings
- `.editorconfig` enforces whitespace consistency

3. Reinstall dependencies after switching OS or Node versions:
```bash
npm run install-all
```

## Key Features Implementation

### Authentication & Onboarding
- Email-based login (no passwords)
- Profile creation after initial login
- Admin approval flow before full access
- JWT token-based authentication

### Approval System
- Tasks automatically escalate if SLA not met
- Multi-level approval chain with notes
- Partial approvals with comments
- Audit trail of all approvals

### Task Management
- Drag-and-drop task assignment
- Real-time status updates
- Image upload with watermarking
- Auto-expiry after configured minutes

### Health Management
- Vaccination and deworming schedules
- Injury logs with photos
- Vet and farrier visit records
- Medication tracking
- Health advisor assignments

### Reporting & Accountability
- Universal reporting panel
- Predefined violation categories
- Evidence gathering with images
- Report escalation to supervisory chain

### Notifications
- Task assignment and reminders
- Missed task alerts
- Approval requests
- Escalation alerts
- Health alerts
- Emergency broadcasts

## API Routes Overview

### Authentication
- `POST /api/auth/login` - Login with email
- `POST /api/auth/profile` - Create user profile
- `GET /api/auth/me` - Get current user

### Horses
- `GET /api/horses` - List all horses
- `GET /api/horses/:id` - Get horse details
- `POST /api/horses` - Create horse (Admin/Instructor)
- `PUT /api/horses/:id` - Update horse (Admin/Instructor)
- `DELETE /api/horses/:id` - Delete horse (Admin)
- `GET /api/horses/:id/health-records` - Get health records
- `GET /api/horses/:id/tasks` - Get assigned tasks

### Tasks
- `GET /api/tasks` - Get tasks (role-filtered)
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task (Admin/Instructor)
- `POST /api/tasks/:id/complete` - Mark task complete
- `POST /api/tasks/:id/upload-proof` - Upload task proof

### Approvals
- `GET /api/approvals` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve task
- `POST /api/approvals/:id/reject` - Reject task
- `GET /api/approvals/task/:taskId` - Get approval chain

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee (Admin)
- `POST /api/employees/:id/approve` - Approve profile (Admin)
- `GET /api/employees/:id/performance` - Performance metrics

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports` - Create report
- `POST /api/reports/:id/resolve` - Resolve report (Admin)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/:id/snooze` - Snooze notification

### Health Records
- `GET /api/health-records` - List health records
- `POST /api/health-records` - Create record (Health Advisor/Admin)
- `PUT /api/health-records/:id` - Update record

### Settings
- `GET /api/settings` - List settings (Admin)
- `PUT /api/settings/:key` - Update setting (Admin)

## Configuration

### Task Settings
- Task templates and predefined types
- Default schedules for recurring tasks
- Auto-expiry time windows
- Required proof settings

### Approval Configuration
- SLA time limits per approval level
- Auto-escalation rules
- Partial approval criteria

### Fine & Report Configuration
- Predefined violation categories
- Fine amounts (if applicable)
- Report visibility rules

### Media Settings
- Image retention period (default: 12 months)
- Compression quality
- Watermark format with timestamp and employee name

## Performance Targets

- Page load time: < 2 seconds
- Image upload support: up to 10MB
- Concurrent users: 50+
- Real-time notifications: < 5 second delay
- System uptime: 99.5%

## Security

- Email-based authentication
- JWT token security
- Role-based access control (RBAC)
- Audit trail for all changes
- Secure image storage on AWS S3
- Session management
- IP address logging

## Future Enhancements

- Mobile applications (iOS & Android)
- GPS tracking for horses
- AI-powered task recommendations
- Predictive health analytics
- Integration with veterinary systems
- Advanced data visualization and reporting
- Custom report builder

## Development Guidelines

### Code Structure
- RESTful API design
- Separation of concerns (routes, controllers, models)
- Error handling and logging
- Input validation
- Consistent naming conventions

### Database
- Timestamps in UTC
- Soft deletes for data integrity
- Proper indexes for performance
- Foreign key relationships

### Testing
- Unit tests for services
- Integration tests for routes
- API testing with sample data

## License

Proprietary - Stable Management System

## Support

For issues and questions, contact the development team.
