# System Architecture - PRD v2.0 Implementation

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Login Page      │  │  Dashboard       │  │  Sidebar Nav │  │
│  │                  │  │                  │  │              │  │
│  │ - Department     │  │ - Overview       │  │ - Role-based │  │
│  │ - Role Select    │  │ - Quick actions  │  │   filtering  │  │
│  │ - Auth flow      │  │ - Stats          │  │ - Emoji nav  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Attendance       │  │ Gate Attendance  │  │ Medicine Log │  │
│  │ Page             │  │ Page             │  │ Page         │  │
│  │                  │  │                  │  │              │  │
│  │ - Time logging   │  │ - Staff log in/  │  │ - Medicine   │  │
│  │ - Shift select   │  │   out            │  │   tracking   │  │
│  │ - Approval flow  │  │ - Visitor log    │  │ - Clinical   │  │
│  │ - History        │  │ - Tabbed view    │  │   notes      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Horse Care Team Page                                    │  │
│  │                                                          │  │
│  │  - Care team assignment      - Team visualization       │  │
│  │  - Role-based filtering      - Summary stats            │  │
│  │  - Staff selection           - Card-based layout        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
                    API Client / HTTP
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CORS Middleware → JWT Validation → Route Dispatcher            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ /api/attendance  │  │ /api/gate-       │  │ /api/        │  │
│  │                  │  │ attendance       │  │ medicine-    │  │
│  │ POST: Log time   │  │                  │  │ logs         │  │
│  │ GET: Fetch logs  │  │ POST: Log staff/ │  │              │  │
│  │                  │  │ visitor          │  │ POST: Log    │  │
│  │ Features:        │  │ GET: Fetch logs  │  │ medicine     │  │
│  │ - Validation     │  │                  │  │ GET: Fetch   │  │
│  │ - Auth check     │  │ Features:        │  │              │  │
│  │ - Error handling │  │ - Duration calc  │  │ Features:    │  │
│  │ - Approval flow  │  │ - Type filter    │  │ - Stock      │  │
│  │                  │  │                  │  │   alerts     │  │
│  └──────────────────┘  └──────────────────┘  │ - Approval   │  │
│                                               │   flow       │  │
│  ┌──────────────────────────────────────┐    │              │  │
│  │ /api/horse-care-team                 │    └──────────────┘  │
│  │                                      │                      │
│  │ POST: Assign care team member        │                      │
│  │ GET: Fetch assignments               │                      │
│  │                                      │                      │
│  │ Features:                            │                      │
│  │ - Role-based filtering               │                      │
│  │ - Horse-staff linking                │                      │
│  │ - Validation                         │                      │
│  └──────────────────────────────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Role-Based Access Control (RBAC)                              │
│  ├─ 18+ Roles across 4 Departments                             │
│  ├─ Permission Matrix                                          │
│  ├─ Supervisor Hierarchy                                       │
│  └─ Approval Workflows                                         │
│                                                                  │
│  Validation Layer                                              │
│  ├─ Input validation                                           │
│  ├─ Business rule validation                                   │
│  ├─ Authorization checks                                       │
│  └─ Error handling                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE ACCESS LAYER (Prisma)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ORM Operations                                                 │
│  ├─ Create (INSERT)                                            │
│  ├─ Read (SELECT)                                              │
│  ├─ Update (UPDATE)                                            │
│  └─ Delete (DELETE)                                            │
│                                                                  │
│  Query Optimization                                            │
│  ├─ Indexed fields                                             │
│  ├─ Relationship loading                                       │
│  ├─ Pagination support                                         │
│  └─ Filtering/Sorting                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL DATABASE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Employee Table  │  │  Horse Table     │  │ Attendance   │  │
│  │                  │  │                  │  │ Log Table    │  │
│  │ - id             │  │ - id             │  │              │  │
│  │ - fullName       │  │ - name           │  │ - id         │  │
│  │ - email          │  │ - breed          │  │ - employeeId │  │
│  │ - designation    │  │ - UELN           │  │ - timeIn     │  │
│  │ - department     │  │ - registrationNo │  │ - timeOut    │  │
│  │ - supervisorId   │  │ - age            │  │ - shift      │  │
│  │ - password       │  │ - measurements   │  │ - isApproved │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ GateAttendance   │  │ MedicineLog      │  │ HorseCare    │  │
│  │ Log Table        │  │ Table            │  │ Team Table   │  │
│  │                  │  │                  │  │              │  │
│  │ - id             │  │ - id             │  │ - id         │  │
│  │ - guardId        │  │ - horseId        │  │ - horseId    │  │
│  │ - personName     │  │ - medicineName   │  │ - staffId    │  │
│  │ - personType     │  │ - quantity       │  │ - role       │  │
│  │ - entryTime      │  │ - timeAdmin      │  │ - createdAt  │  │
│  │ - exitTime       │  │ - notes          │  │ - updatedAt  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Department Organization

```
┌─────────────────────────────────────────────────────────────────┐
│                   EQUESTRIAN FACILITY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LEADERSHIP                                             │   │
│  │  • Director                                             │   │
│  │  • School Administrator                                │   │
│  │  • Super Admin                                          │   │
│  │  (Access to all features and reports)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ GROUND OPERATIONS    │  │ STABLE OPERATIONS    │             │
│  │                      │  │                      │             │
│  │ • Guard              │  │ • Groom              │             │
│  │ • Gardener           │  │ • Riding Boy         │             │
│  │ • Housekeeping       │  │ • Rider              │             │
│  │ • Electrician        │  │ • Farrier            │             │
│  │ • Ground Supervisor  │  │ • Jamedar            │             │
│  │                      │  │ • Instructor         │             │
│  │ Features:            │  │ • Stable Manager     │             │
│  │ • Gate logs          │  │                      │             │
│  │ • Attendance         │  │ Features:            │             │
│  │ • Visitor tracking   │  │ • Attendance         │             │
│  │                      │  │ • Medicine logs      │             │
│  │                      │  │ • Care team mgmt     │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │ ACCOUNTS/ADMIN       │                                       │
│  │                      │                                       │
│  │ • Executive Admin    │                                       │
│  │ • Executive Accounts │                                       │
│  │ • Senior Executive   │                                       │
│  │                      │                                       │
│  │ Features:            │                                       │
│  │ • Reporting          │                                       │
│  │ • Analytics          │                                       │
│  │ • Approvals          │                                       │
│  └──────────────────────┘                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow - Attendance Workflow

```
┌─────────────────┐
│  Employee User  │
│  Logs in         │
└────────┬────────┘
         ↓
┌─────────────────┐
│  AttendancePage │
│  Form opens     │
└────────┬────────┘
         ↓
┌─────────────────────────┐
│  User enters:           │
│  - Time In/Out          │
│  - Shift (if required)  │
│  - Notes                │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│  Client Validation      │
│  - Required fields      │
│  - Date/time format     │
│  - Logical constraints  │
└────────┬────────────────┘
         ↓
┌─────────────────────────┐
│  POST /api/attendance   │
│  (with JWT token)       │
└────────┬────────────────┘
         ↓
┌──────────────────────────────┐
│  Server Validation:          │
│  - User authorization        │
│  - Supervisor verification   │
│  - Business rules            │
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│  Database Insert:            │
│  AttendanceLog record        │
│  isApproved = false          │
└────────┬─────────────────────┘
         ↓
┌─────────────────────────┐
│  Response to Client     │
│  Success message        │
│  Record data            │
└────────┬────────────────┘
         ↓
┌──────────────────────────┐
│  Supervisor reviews      │
│  pending approvals       │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│  POST approve/reject     │
│  (supervisor action)     │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│  Update in database      │
│  isApproved = true/false │
│  approverComment         │
└────────┬─────────────────┘
         ↓
┌──────────────────────────┐
│  Notification sent       │
│  (if implemented)        │
└──────────────────────────┘
```

## Role-Based Access Control Matrix

```
┌──────────────────┬────────┬────────┬──────────┬──────────┐
│ Feature          │ Attend │ Gate   │ Medicine │ CareTeam │
│                  │ ance   │ Attend │ Logs     │          │
├──────────────────┼────────┼────────┼──────────┼──────────┤
│ Guard            │   ✓    │   ✓    │    ✗     │    ✗     │
│ Gardener         │   ✓    │   ✗    │    ✗     │    ✗     │
│ Housekeeping     │   ✓    │   ✗    │    ✗     │    ✗     │
│ Electrician      │   ✓    │   ✗    │    ✗     │    ✗     │
│ Ground Supv      │   ✓    │   ✓    │    ✗     │    ✗     │
├──────────────────┼────────┼────────┼──────────┼──────────┤
│ Groom            │   ✓    │   ✗    │    ✗     │    ✓*    │
│ Riding Boy       │   ✓    │   ✗    │    ✗     │    ✓*    │
│ Rider            │   ✓    │   ✗    │    ✗     │    ✓*    │
│ Farrier          │   ✓    │   ✗    │    ✗     │    ✗     │
│ Jamedar          │   ✓    │   ✗    │    ✓     │    ✓*    │
│ Instructor       │   ✓    │   ✗    │    ✗     │    ✓*    │
│ Stable Manager   │   ✓    │   ✗    │    ✓**   │    ✓**   │
├──────────────────┼────────┼────────┼──────────┼──────────┤
│ Executive Admin  │   ✓    │   ✗    │    ✓     │    ✓     │
│ Exec Accounts    │   ✓    │   ✗    │    ✗     │    ✗     │
│ Senior Exec      │   ✓    │   ✗    │    ✓***  │    ✗     │
├──────────────────┼────────┼────────┼──────────┼──────────┤
│ School Admin     │   ✓    │   ✓    │    ✓     │    ✓     │
│ Director         │   ✓    │   ✓    │    ✓     │    ✓     │
│ Super Admin      │   ✓    │   ✓    │    ✓     │    ✓     │
└──────────────────┴────────┴────────┴──────────┴──────────┘

Legend:
✓  = Full access
✓* = Can view and be assigned, not create
✓** = Can create, manage, and approve
✓*** = Can approve only
✗  = No access
```

## Component Reusability

```
Reusable Components
│
├─ Forms
│  ├─ TimeInput (with validation)
│  ├─ EmployeeSelect (with dropdown)
│  ├─ HorseSelect (with details)
│  ├─ RoleSelect (department-based)
│  └─ NotesTextarea
│
├─ Display Components
│  ├─ Table (with sorting/filtering)
│  ├─ Card (for horses/employees)
│  ├─ Badge (for status)
│  ├─ LoadingSpinner
│  └─ EmptyState
│
├─ Navigation
│  ├─ Sidebar (with role filtering)
│  └─ Breadcrumbs (optional)
│
└─ Utilities
   ├─ Message (success/error)
   ├─ Modal (for forms)
   └─ Tabs (for views)
```

## Data Relationships

```
Employee
├─ Many AttendanceLogs
├─ Many GateAttendanceLogs (if Guard)
├─ Many MedicineLogs (if Jamedar)
├─ Many HorseCareTeams
└─ Supervises: Many Employees (via supervisorId)

Horse
├─ Many AttendanceLogs (for riding/grooming)
├─ Many MedicineLogs
├─ Many HorseCareTeams
└─ Many HealthRecords

HorseCareTeam
├─ One Horse
├─ One Employee (staff)
└─ Role: 'Primary Groom' | 'Alternative Groom' | 'Rider' | 'Jamedar' | 'Instructor'

Department
├─ Many Employees
└─ Multiple Roles per Department
```

---

**Architecture Diagram Generated**: January 19, 2025  
**System Version**: 2.0  
**Status**: Production Ready ✅
