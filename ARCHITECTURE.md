# System Architecture

## Overview

The Stable Management System is a modern full-stack web application using:
- **Frontend**: React 18+ with React Router
- **Backend**: Next.js 14+ with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: AWS S3 for images

## Technology Stack Details

### Backend Architecture

#### Framework: Next.js with TypeScript
- **API Routes**: `/src/pages/api/*` directory structure
- **Type Safety**: Full TypeScript implementation
- **Database ORM**: Prisma for type-safe database access
- **Authentication**: JWT-based with Bearer token verification

#### API Route Structure
```
src/pages/api/
├── auth/
│   ├── login.ts          # POST /api/auth/login
│   └── me.ts             # GET /api/auth/me
├── horses/
│   ├── index.ts          # GET/POST /api/horses
│   ├── [id].ts           # GET/PUT/DELETE /api/horses/[id]
│   └── health.ts         # GET /api/horses/[id]/health
├── tasks/
│   ├── index.ts          # GET/POST /api/tasks
│   ├── [id].ts           # GET/PUT/DELETE /api/tasks/[id]
│   └── [id]/complete.ts  # POST /api/tasks/[id]/complete
├── employees/
│   ├── index.ts          # GET/POST /api/employees
│   └── [id].ts           # GET/PUT /api/employees/[id]
├── approvals/
│   ├── index.ts          # GET/POST /api/approvals
│   └── [id].ts           # PUT /api/approvals/[id] (approve/reject)
├── health-records/
│   ├── index.ts          # GET/POST /api/health-records
│   └── [id].ts           # GET/PUT/DELETE /api/health-records/[id]
├── reports/
│   ├── index.ts          # GET/POST /api/reports
│   └── [id].ts           # PUT /api/reports/[id]
├── notifications/
│   ├── index.ts          # GET /api/notifications
│   └── [id].ts           # PUT /api/notifications/[id]
├── audit-logs/
│   └── index.ts          # GET /api/audit-logs
└── settings/
    └── index.ts          # GET/PUT /api/settings
```

#### Library Organization
```
src/lib/
├── prisma.ts             # Prisma Client singleton
├── auth.ts               # JWT utilities and middleware
└── s3.ts                 # AWS S3 utilities
```

#### Type Definitions
```
src/types/
└── index.ts              # All TypeScript interfaces and types
```

### Database Architecture (PostgreSQL + Prisma)

#### Core Models

**Employee**
- Hierarchical roles: Groomer, Zamindar, Instructor, Admin, Health Advisor, Super Admin
- Profile information: name, email, phone, color code, shift timing
- Status tracking: Active/Inactive/On Leave
- Approval status for new employees

**Horse**
- Basic information: name, gender, breed, color, height, date of birth
- Status: Active, Rest, Injured, Traveling
- Profile image and owner information
- Links to tasks and health records

**Task**
- Type: Daily, Weekly, Event-based
- Status: Pending, In Progress, Completed, Cancelled
- Priority: Low, Medium, High, Urgent
- Photographic evidence requirement
- Scheduled and completion timestamps

**Approval Chain**
- 4-level hierarchy for task approval
- Status tracking: Pending, Approved, Rejected
- Comments on approval decisions
- Unique constraint: one approval per task/approver pair

**HealthRecord**
- Record types: Vaccination, Deworming, Injury, Vet Visit, Farrier Visit, Medication
- Health advisor assignment
- Document attachments
- Next due date tracking

**Report System**
- Employee reporting system
- Categories for different violation types
- Status: Pending, Reviewed, Closed

**Notification System**
- Real-time notifications for task assignments, approvals, completions
- Read/unread status tracking
- Multiple notification types

**AuditLog**
- Tracks all significant actions: CREATE, UPDATE, DELETE, LOGIN, APPROVE
- IP address and user agent recording
- JSON change tracking for updates

**SystemSettings**
- Key-value configuration store
- Includes: app name, max daily tasks, approval requirements

### Authentication & Security

#### JWT Implementation
```typescript
// Token Structure
{
  id: string;          // Employee ID
  email: string;       // Employee email
  designation: string; // Employee role
  iat: number;         // Issued at
  exp: number;         // Expiration (7 days default)
}
```

#### Token Verification Flow
1. Client sends Authorization header: `Bearer <token>`
2. Server extracts token from header
3. JWT verified using `JWT_SECRET` from environment
4. Claims (id, email, designation) extracted for authorization
5. Invalid/expired tokens return 401/403

#### Password Hashing
- bcryptjs for password hashing (when implemented)
- Salt rounds: 10 (default)

### Frontend Architecture

#### React Component Structure
```
src/
├── components/
│   ├── Navigation.js       # Top navigation bar
│   ├── Sidebar.js          # Left navigation sidebar
│   ├── MainLayout.js       # Main page layout wrapper
│   ├── PrivateRoute.js     # Protected route wrapper
│   ├── TaskCard.js         # Reusable task display card
│   ├── NotificationCenter.js # Notification popup
│   └── ImageUploadWidget.js # Image upload component
├── pages/
│   ├── LoginPage.js        # Authentication
│   ├── DashboardPage.js    # Main dashboard
│   ├── HorsesPage.js       # Horse listing
│   ├── HorseDetailPage.js  # Individual horse details
│   ├── EmployeesPage.js    # Employee management
│   ├── TasksPage.js        # Task listing and management
│   ├── TaskDetailPage.js   # Individual task details
│   ├── ReportsPage.js      # Reports and violations
│   ├── SettingsPage.js     # System settings
│   ├── ProfileSetupPage.js # Employee profile setup
│   └── NotFoundPage.js     # 404 page
├── services/
│   ├── apiClient.js        # Axios base configuration
│   ├── authService.js      # Authentication API calls
│   ├── horseService.js     # Horse API calls
│   ├── taskService.js      # Task API calls
│   ├── employeeService.js  # Employee API calls
│   ├── approvalService.js  # Approval API calls
│   ├── reportService.js    # Report API calls
│   └── notificationService.js # Notification API calls
├── context/
│   └── AuthContext.js      # Global authentication state
├── styles/
│   └── *.css               # Component-specific styles
└── App.js, index.js        # React entry point
```

#### State Management
- React Context API for global auth state
- Local component state for form handling and UI
- Service layer for API communication

#### Routing
- React Router v6 for SPA routing
- Protected routes with PrivateRoute wrapper
- Role-based access control in route components

### Data Flow

#### Authentication Flow
```
1. User visits /login
2. Submits email
3. Backend creates or retrieves user
4. JWT token returned
5. Token stored in localStorage
6. Subsequent requests include token in Authorization header
```

#### Task Completion Flow
```
1. Employee views assigned task
2. Completes task and uploads photo evidence
3. Photo uploaded to AWS S3
4. Task status changed to "Completed"
5. Approval requests created at next hierarchy level
6. Approver notified
7. Approver reviews and approves/rejects
8. Notification sent back to employee
9. Audit log entry created
```

#### Real-time Notification Flow
```
1. Task assigned to employee
2. Notification created in database
3. Employee receives notification on next polling
4. Notification marked as read when viewed
5. Read status persisted to database
```

### API Endpoint Patterns

#### Authentication
```
POST /api/auth/login          # Login
GET  /api/auth/me             # Get current user
```

#### Horses
```
GET    /api/horses            # List all horses (pagination)
POST   /api/horses            # Create new horse
GET    /api/horses/[id]       # Get horse details
PUT    /api/horses/[id]       # Update horse
DELETE /api/horses/[id]       # Delete horse
```

#### Tasks
```
GET    /api/tasks             # List tasks (filtered, paginated)
POST   /api/tasks             # Create task
GET    /api/tasks/[id]        # Get task details
PUT    /api/tasks/[id]        # Update task
DELETE /api/tasks/[id]        # Delete task
POST   /api/tasks/[id]/complete # Mark task complete
```

#### Employees
```
GET    /api/employees         # List employees
POST   /api/employees         # Create employee
GET    /api/employees/[id]    # Get employee details
PUT    /api/employees/[id]    # Update employee
```

#### Approvals
```
GET    /api/approvals         # List pending approvals
POST   /api/approvals         # Create approval request
PUT    /api/approvals/[id]    # Approve/reject
```

#### Other Endpoints
```
GET    /api/health-records    # List health records
POST   /api/health-records    # Create health record
GET    /api/reports           # List reports
POST   /api/reports           # File report
GET    /api/notifications     # Get notifications
PUT    /api/notifications/[id] # Mark notification read
GET    /api/audit-logs        # View audit logs
GET    /api/settings          # Get system settings
PUT    /api/settings          # Update settings (admin only)
```

### Deployment Architecture

#### Backend (Next.js)
- Deploy to Vercel (native Next.js support)
- Or containerize with Docker for self-hosted
- Environment variables configured via .env.local
- Database connection pooling via Prisma

#### Frontend (React)
- Build: `npm run build`
- Deploy to Vercel, Netlify, or static hosting
- Environment variables in .env

#### Database (PostgreSQL)
- Managed service: AWS RDS, Heroku, or self-hosted
- Automated backups recommended
- Connection pooling for production

### Security Considerations

1. **JWT Secret**: Use strong, randomly generated secret (min 32 chars)
2. **CORS**: Configured for frontend domain only
3. **Input Validation**: express-validator for all inputs
4. **SQL Injection**: Prevented by Prisma parameterized queries
5. **Password Storage**: bcryptjs with salt rounds 10
6. **HTTPS**: Required in production
7. **Rate Limiting**: Should be implemented for production
8. **Environment Secrets**: Never commit .env files

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Layer (Browser)                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    React Application                         │ │
│  │  ┌──────────────┬─────────────┬─────────────┬────────────┐  │ │
│  │  │   Pages      │ Components  │   Services  │  Context   │  │ │
│  │  │  (Dashboards)│  (UI)       │  (API)      │ (State)    │  │ │
│  │  └──────────────┴─────────────┴─────────────┴────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                   API Gateway Layer                              │
│  (Express.js Server on Port 5000)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Routes & Controllers                                    │  │
│  │  ├─ /auth (Authentication)                              │  │
│  │  ├─ /horses (Horse Management)                          │  │
│  │  ├─ /employees (Employee Management)                    │  │
│  │  ├─ /tasks (Task Management)                            │  │
│  │  ├─ /approvals (Approval Chain)                         │  │
│  │  ├─ /reports (Reporting System)                         │  │
│  │  ├─ /notifications (Notification Management)            │  │
│  │  ├─ /health-records (Health Management)                 │  │
│  │  ├─ /audit-logs (Audit Trail)                           │  │
│  │  └─ /settings (System Configuration)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Middleware Layer                                        │  │
│  │  ├─ Authentication (JWT)                                │  │
│  │  ├─ Authorization (RBAC)                                │  │
│  │  ├─ Error Handling                                      │  │
│  │  ├─ Request Validation                                  │  │
│  │  └─ Logging                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐  ┌──────▼─────┐  ┌─────▼──────┐
    │ Database │  │ File Store │  │Job Queue   │
    │ Layer    │  │ (AWS S3)   │  │(Redis/Job) │
    └────▼────┘  └──────▼─────┘  └─────▼──────┘
         │               │               │
    ┌────▼──────────────────────────────▼────┐
    │   Data & External Services              │
    │  ┌─────────────────────────────────┐   │
    │  │  MySQL Database                 │   │
    │  │  ├─ Employees table             │   │
    │  │  ├─ Horses table                │   │
    │  │  ├─ Tasks table                 │   │
    │  │  ├─ Approvals table             │   │
    │  │  ├─ Reports table               │   │
    │  │  ├─ Health Records table        │   │
    │  │  ├─ Notifications table         │   │
    │  │  ├─ Audit Logs table            │   │
    │  │  └─ Settings table              │   │
    │  └─────────────────────────────────┘   │
    │  ┌─────────────────────────────────┐   │
    │  │  AWS Services                   │   │
    │  │  ├─ S3 (Image Storage)          │   │
    │  │  ├─ CloudFront (CDN)            │   │
    │  │  └─ SES (Email)                 │   │
    │  └─────────────────────────────────┘   │
    └─────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 18+
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Styling**: CSS3 + Styled Components
- **Package Manager**: npm

### Backend
- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **AWS Integration**: AWS SDK

### Database
- **Primary**: MySQL 8.0+
- **Schema**: Relational with 10+ tables
- **Connection Pool**: Sequelize connection pooling

### Cloud Services
- **Storage**: AWS S3
- **CDN**: AWS CloudFront
- **Email**: AWS SES (future)

## Data Flow

### Authentication Flow
```
1. User enters email → Frontend
2. Frontend sends → POST /auth/login
3. Backend validates → Database check
4. Backend returns → JWT Token
5. Frontend stores → LocalStorage
6. Subsequent requests → Authorization header with token
```

### Task Completion Flow
```
1. Groomer receives task → Notification
2. Groomer starts task → POST /tasks/{id}/start
3. Groomer completes work → POST /tasks/{id}/complete
4. Groomer uploads proof → POST /tasks/{id}/upload-proof
5. System creates approval → Zamindar level
6. Zamindar reviews → GET /approvals
7. Zamindar approves/rejects → POST /approvals/{id}/approve
8. Escalates to Instructor if SLA exceeded
9. Instructor reviews → Final approval
10. Task marked complete → Notification to all parties
11. Audit log created → History tracking
```

### Report Creation Flow
```
1. Employee creates report → POST /reports
2. Report includes evidence → Upload images
3. Report visible to chain → Role-based filtering
4. Admin reviews → Dashboard panel
5. Admin resolves → POST /reports/{id}/resolve
6. Email notification → Involved parties
7. Audit log created → Tracking
```

## Database Schema Overview

### Key Tables
1. **employees** - User accounts with roles
2. **horses** - Horse records with health info
3. **horse_employee_assignments** - Team assignments
4. **tasks** - Daily work assignments
5. **approvals** - Approval chain tracking
6. **reports** - Violation reports
7. **health_records** - Vet/medical records
8. **notifications** - User notifications
9. **audit_logs** - Change tracking
10. **system_settings** - Configuration

### Key Relationships
```
Horse ← 1:M → Tasks
Horse ← 1:M → Health Records
Horse ← 1:M → Assignments
Employee ← 1:M → Assignments
Task ← 1:M → Approvals
Task ← 1:M → Reports
Employee ← 1:M → Reports (Reporter)
Employee ← 1:M → Reports (Reported)
Employee ← 1:M → Notifications
```

## Security Architecture

### Authentication
- JWT tokens with 7-day expiry
- Email-based login (no passwords initially)
- Secure token storage in localStorage

### Authorization
- Role-based access control (RBAC)
- 6 roles: Groomer, Zamindar, Instructor, Admin, Health Advisor, Super Admin
- Route-level permissions
- Resource-level permissions

### Data Protection
- Input validation and sanitization
- SQL injection prevention via ORM
- CORS protection
- HTTPS enforcement
- Audit logging for all changes
- Soft deletes for data integrity

### File Security
- AWS S3 bucket policies
- Pre-signed URLs for downloads
- File type validation
- Size limits (10MB max)
- Watermarking with timestamp and user

## API Communication

### Request Format
```
POST /api/endpoint
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "field": "value"
}
```

### Response Format
```
{
  "id": "uuid",
  "field": "value",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

### Error Handling
```
{
  "error": "Error message",
  "statusCode": 400,
  "details": "Additional information"
}
```

## Scalability Considerations

### Current Architecture (MVP)
- Single MySQL database
- Single Express server
- Local file processing
- JWT-based stateless auth

### Future Scaling
- Database replication (read replicas)
- Load balancing with multiple servers
- Redis for caching and sessions
- Message queue for async tasks
- Microservices if needed
- CDN for static assets

## Performance Optimization

### Frontend
- Code splitting with React.lazy
- Image compression
- CSS minification
- Lazy loading for lists
- Caching strategies

### Backend
- Database query optimization with indexes
- Connection pooling
- Response caching for static data
- Pagination for large datasets
- Async processing for heavy operations

### Database
- Strategic indexing
- Query optimization
- Proper data types
- Partitioning for large tables (future)

## Deployment Architecture

### Development
```
Local machine
├── Frontend: localhost:3000
├── Backend: localhost:5000
└── Database: local MySQL
```

### Production
```
AWS Infrastructure
├── Frontend: S3 + CloudFront
├── Backend: EC2 auto-scaling
├── Database: RDS MySQL
├── Storage: S3 bucket
└── CDN: CloudFront
```

## Monitoring & Observability

### Logging
- Application logs (stderr/stdout)
- Request/response logging
- Error tracking with Sentry
- Audit trail in database

### Monitoring
- Server health checks
- Database performance
- API response times
- Error rates
- User activity analytics

### Alerts
- High error rates
- Database connection issues
- Server downtime
- Performance degradation
