# Role-Based Work Assignments

## Role Hierarchy & Responsibilities

### 1. **Groomer** (Level 0)
**Primary Responsibility**: Execute daily grooming and horse care tasks

**Assigned Tasks**:
- ✅ Feed horses (morning/evening)
- ✅ Groom and brush horses
- ✅ Clean stables
- ✅ Water and exercise horses
- ✅ Monitor horse behavior/health
- ✅ Handle basic maintenance tasks

**Permissions**:
- View assigned horses
- View assigned tasks
- Complete tasks and upload proof/evidence
- Submit task completion for approval

**Cannot Access**:
- Create tasks
- Approve/reject tasks
- Manage employees
- View health records
- Access reports

---

### 2. **Zamindar** (Level 1)
**Primary Responsibility**: Supervise groomers and manage daily operations

**Assigned Tasks**:
- ✅ Create daily tasks for groomers
- ✅ Assign horses to groomers
- ✅ Review completed tasks
- ✅ Approve/reject groomer task submissions
- ✅ Monitor team performance
- ✅ Handle SLA escalations (2-hour response time)
- ✅ Report issues to higher management

**Permissions**:
- Create and assign tasks
- View all horses and employees
- Approve/reject task submissions (first level)
- Manage task assignments
- View team notifications
- Create reports on team performance

**Cannot Access**:
- Manage employee roles
- System settings
- View health advisor records (unless assigned)

---

### 3. **Instructor** (Level 2)
**Primary Responsibility**: Handle training tasks and higher-level approvals

**Assigned Tasks**:
- ✅ Create training programs for horses
- ✅ Create training-specific tasks
- ✅ Oversee groomer and zamindar performance
- ✅ Approve tasks at secondary level (4-hour response time)
- ✅ Conduct performance reviews
- ✅ Handle specialized training requests

**Permissions**:
- Create and manage training tasks
- Approve/reject task submissions (second level)
- View all system activities
- Generate performance reports
- Manage training schedules
- Create horses (training-related)

**Cannot Access**:
- Manage employee roles/access
- Delete employees
- System settings
- User management

---

### 4. **Health Advisor** (Level 1)
**Primary Responsibility**: Manage horse health records and veterinary care

**Assigned Tasks**:
- ✅ Create and maintain health records
- ✅ Record vaccinations
- ✅ Document deworming schedules
- ✅ Track injuries and treatments
- ✅ Schedule vet visits
- ✅ Monitor health alerts
- ✅ Generate health reports

**Permissions**:
- Create/edit health records
- View all horse health history
- Set vaccination reminders
- Create health-related tasks
- Generate health reports
- View groomer/instructor activities (health-related)

**Cannot Access**:
- Approve general tasks
- Manage employees
- System settings
- Access reports module

---

### 5. **Admin** (Level 2)
**Primary Responsibility**: System administration and oversight

**Assigned Tasks**:
- ✅ Create and manage employees
- ✅ Approve new employee registrations
- ✅ Create and assign tasks
- ✅ Final task approvals (3rd level)
- ✅ Manage horses
- ✅ Handle system reports
- ✅ Resolve employee disputes
- ✅ Monitor SLA compliance

**Permissions**:
- Full access to employees (CRUD operations)
- Create, edit, delete tasks
- Approve tasks at final level
- Create and manage horses
- View all reports
- Access audit logs
- Generate compliance reports
- View all system activities

**Cannot Access**:
- System settings/configuration
- Database backups
- API key management

---

### 6. **Super Admin** (Level 3)
**Primary Responsibility**: System configuration and security

**Assigned Tasks**:
- ✅ Configure system settings
- ✅ Manage API keys and integrations
- ✅ Setup email/notification templates
- ✅ Configure SLA parameters
- ✅ Backup and disaster recovery
- ✅ Performance optimization
- ✅ Security audits

**Permissions**:
- Unrestricted system access
- Configure system settings
- Manage all users/roles
- View all audit logs
- System maintenance
- Database operations
- Integration management
- API configuration

---

## Task Assignment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   TASK CREATION & APPROVAL FLOW              │
└─────────────────────────────────────────────────────────────┘

1. ADMIN/INSTRUCTOR creates task
   └─> Assigns to GROOMER
   
2. GROOMER receives task notification
   └─> Can view in "My Daily Tasks"
   └─> Must complete with proof/images
   
3. GROOMER completes task
   └─> Submits for approval
   └─> Creates Approval record (Level 1)
   
4. ZAMINDAR reviews approval (2-hour SLA)
   ├─> APPROVES → Closes task
   └─> REJECTS → Returns to groomer
   
5. If SLA exceeded
   └─> Escalates to INSTRUCTOR (Level 2)
   
6. INSTRUCTOR reviews (4-hour SLA)
   ├─> APPROVES → Closes task
   └─> REJECTS → Returns to groomer
   
7. Final ADMIN review available
   └─> For critical issues
```

## Work Distribution by Module

| Module | Groomer | Zamindar | Instructor | Admin | Health Advisor | Super Admin |
|--------|---------|----------|-----------|-------|----------------|------------|
| **Horses** | View | View/Create | View/Create | Full Access | View | Full Access |
| **Tasks** | Execute | Create/Approve | Create/Approve | Full Access | Create Health Tasks | Full Access |
| **Approvals** | Submit | Approve(L1) | Approve(L2) | Approve(L3) | - | Full Access |
| **Employees** | View Profile | View Team | View All | Full CRUD | View Team | Full Access |
| **Health Records** | View Assigned | View All | View All | Full Access | Full CRUD | Full Access |
| **Reports** | View Own | View Team | View All | Full Access | Generate Health | Full Access |
| **Settings** | - | - | - | - | - | Configure |

