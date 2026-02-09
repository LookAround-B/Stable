# EQUESTRIAN MANAGEMENT SYSTEM
## COMPLETE ROLES & RESPONSIBILITIES GUIDE

**Document Version:** 1.0  
**Date:** February 8, 2026  
**System:** Horsestable Management Platform  
**Total Roles:** 18 Roles across 4 Departments

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Permission Summary](#permission-summary)
3. [Leadership Department (3 Roles)](#leadership-department)
4. [Stable Operations Department (7 Roles)](#stable-operations-department)
5. [Ground Operations Department (5 Roles)](#ground-operations-department)
6. [Accounts/Administration Department (3 Roles)](#accounts-administration-department)
7. [Supervisor Hierarchy](#supervisor-hierarchy)
8. [Test User Credentials](#test-user-credentials)
9. [Quick Reference Matrix](#quick-reference-matrix)

---

## SYSTEM OVERVIEW

The Equestrian Management System implements a comprehensive Role-Based Access Control (RBAC) system with 18 distinct roles organized across 4 departments. Each role has specific permissions and responsibilities aligned with equestrian facility operations.

### Key Statistics
- **Total Users:** 19 pre-configured test accounts
- **Departments:** 4 (Leadership, Stable Operations, Ground Operations, Accounts/Admin)
- **Supervisory Roles:** 6 (with team management capabilities)
- **Subordinate Relationships:** 13 configured supervisor-subordinate pairs
- **Authentication:** Email/Password with JWT tokens
- **Default Password:** password123 (for all test accounts and new employees)

---

## PERMISSION SUMMARY

### WHO CAN ADD EMPLOYEES?
**Only 3 Leadership Roles:**
- ✅ Super Admin
- ✅ Director
- ✅ School Administrator

**Reason:** Employee management is restricted to top-level leadership to maintain hiring control and organizational structure.

### WHO CAN APPROVE EMPLOYEES?
**Only 3 Leadership Roles:**
- ✅ Super Admin
- ✅ Director
- ✅ School Administrator

**Process:** New employees start with "Pending" status. Only these roles see the "Approve" button in the system.

### WHO CAN ADD HORSES?
**5 Roles with Horse Management Access:**
- ✅ Super Admin
- ✅ Director
- ✅ School Administrator
- ✅ Stable Manager
- ✅ Instructor

**Reason:** Horse management is primarily a Stable Operations function, requiring leadership oversight and stable expertise.

### WHO CAN SEE TEAM MEMBERS?
**6 Supervisory Roles:**
- Super Admin (all employees)
- Director (all employees)
- School Administrator (all employees)
- Stable Manager (6 subordinates)
- Ground Supervisor (5 subordinates)
- Senior Executive Accounts (2 subordinates)

---

## LEADERSHIP DEPARTMENT

### Role 1: SUPER ADMIN 🔑

**Position:** System Administrator  
**Department:** Leadership  
**Level:** Top Executive  
**Test Login:** admin@test.com  
**Password:** password123

#### Core Responsibilities
- Complete system access and control
- User and role management
- System configuration and settings
- Database administration
- Security and access control
- All approval capabilities

#### Specific Permissions
✅ **Employee Management:**
- Create new employees
- Approve/reject employee accounts
- Edit employee details
- Assign roles and departments
- Configure supervisor relationships

✅ **Horse Management:**
- Add new horses
- Edit horse details
- Assign horses to care teams
- Manage horse health records
- Archive/reactivate horses

✅ **System Administration:**
- View all departments
- Access all features
- Modify system settings
- Generate system reports
- Audit log access
- Export all data

✅ **Approval Authority:**
- Approve all tasks
- Approve medicine logs
- Approve attendance records
- Approve financial transactions
- Final authority on all matters

#### Dashboard Access
- Employee management dashboard
- Horse management overview
- System health monitoring
- Real-time notifications
- Audit log viewer
- Report generation tools

---

### Role 2: DIRECTOR 🔑

**Position:** Facility Director/Owner  
**Department:** Leadership  
**Level:** Top Executive  
**Test Login:** director@test.com  
**Password:** password123

#### Core Responsibilities
- Strategic oversight and policy decisions
- Cross-department coordination
- Final authority on major decisions
- Financial oversight
- Compliance monitoring
- Stakeholder management

#### Specific Permissions
✅ **Employee Management:**
- Create new employees
- Approve/reject employee accounts
- Access all employee records
- Performance review access
- Disciplinary action authority

✅ **Horse Management:**
- Add and manage horses
- Oversee horse care programs
- Review health records
- Approve major treatments
- Insurance and ownership decisions

✅ **Financial Oversight:**
- View all financial reports
- Approve major expenses
- Budget monitoring
- Revenue tracking
- Financial forecasting

✅ **Operational Control:**
- Policy creation and updates
- Department performance review
- Incident management
- Risk assessment
- Strategic planning

#### Dashboard Access
- Executive dashboard
- All department views
- Financial analytics
- Performance metrics
- Compliance reports
- Strategic planning tools

---

### Role 3: SCHOOL ADMINISTRATOR 🔑

**Position:** School/Training Compliance Officer  
**Department:** Leadership  
**Level:** Senior Management  
**Test Login:** school-admin@test.com  
**Password:** password123

#### Core Responsibilities
- Educational program compliance
- Student safety oversight
- Training curriculum management
- Regulatory compliance
- Cross-department reporting
- Quality assurance

#### Specific Permissions
✅ **Employee Management:**
- Create new employees
- Approve employee accounts
- Instructor certification tracking
- Training staff oversight

✅ **Horse Management:**
- Add training horses
- Monitor horse welfare
- Training suitability assessment
- Student-horse assignments

✅ **Compliance Monitoring:**
- Safety protocol enforcement
- Training standard compliance
- Documentation review
- Incident reporting
- Regulatory submissions

✅ **Reporting Access:**
- Generate compliance reports
- Student progress reports
- Safety incident reports
- Training effectiveness metrics
- Cross-department analytics

#### Dashboard Access
- Compliance dashboard
- Training program overview
- Student management
- Safety monitoring
- Report generation
- Documentation center

---

## STABLE OPERATIONS DEPARTMENT

### Role 4: STABLE MANAGER 🐴 (SUPERVISOR)

**Position:** Head of Stable Operations  
**Department:** Stable Operations  
**Level:** Supervisor (Level 3)  
**Test Login:** manager@test.com  
**Password:** password123  
**Supervises:** 6 team members

#### Team Members Supervised
1. James Instructor (instructor@test.com)
2. Raj Jamedar (jamedar@test.com)
3. Sarah Groom (groom@test.com)
4. Tommy Riding Boy (riding-boy@test.com)
5. Alex Rider (rider@test.com)
6. Mike Farrier (farrier@test.com)

#### Core Responsibilities
- Overall stable operations management
- Staff scheduling and coordination
- Horse care oversight
- Task assignment and approval
- Medicine log approval
- Health record management
- Equipment and supply management

#### Specific Permissions
✅ **Team Management:**
- View team attendance
- Approve team tasks
- Schedule staff shifts
- Assign responsibilities
- Performance monitoring
- Disciplinary recommendations

✅ **Horse Care:**
- Assign horses to staff
- Approve care plans
- Monitor horse health
- Coordinate with veterinarians
- Manage feeding schedules
- Oversee training programs

✅ **Task Management:**
- Create tasks for team
- Assign daily activities
- Approve completed tasks
- Review photo evidence
- Track task completion rates
- Generate team reports

✅ **Medicine & Health:**
- Approve medicine logs
- Review health records
- Coordinate treatments
- Manage medicine inventory
- Stock alert monitoring

#### Dashboard Access
- Team management dashboard
- Horse care overview
- Task tracking system
- Medicine log approval queue
- Team attendance records
- Performance analytics

---

### Role 5: INSTRUCTOR 🐴

**Position:** Horse Training Supervisor  
**Department:** Stable Operations  
**Level:** Specialist  
**Test Login:** instructor@test.com  
**Password:** password123  
**Reports To:** Stable Manager (Emma Manager)

#### Core Responsibilities
- Horse training programs
- Student instruction
- Training activity supervision
- Progress tracking
- Activity review and approval
- Safety compliance

#### Specific Permissions
✅ **Horse Management:**
- Add new horses (training horses)
- Update horse training status
- Assign horses to students
- Log training sessions
- Track training progress

✅ **Training Activities:**
- Create training tasks
- Schedule training sessions
- Log student activities
- Review performance
- Approve activity logs
- Upload training photos

✅ **Student Management:**
- Student progress tracking
- Performance assessments
- Training plan creation
- Safety monitoring
- Progress reports

#### Dashboard Access
- Training schedule
- Student roster
- Horse assignment board
- Activity logs
- Progress tracking
- Training reports

---

### Role 6: JAMEDAR 🐴

**Position:** Medicine Specialist/Veterinary Assistant  
**Department:** Stable Operations  
**Level:** Specialist  
**Test Login:** jamedar@test.com  
**Password:** password123  
**Reports To:** Stable Manager (Emma Manager)

#### Core Responsibilities
- Medicine administration and tracking
- Horse health monitoring
- Treatment record maintenance
- Medicine inventory management
- Health alert creation
- Veterinary coordination

#### Specific Permissions
✅ **Medicine Administration:**
- Log medicine given to horses
- Upload proof photos (with watermark)
- Record dosage and timing
- Track medicine stock levels
- Create stock alerts
- Submit for approval

✅ **Health Tracking:**
- Create health records
- Log treatments
- Monitor horse conditions
- Track vaccination schedules
- Record deworming
- Document injuries

✅ **Inventory Management:**
- Track medicine stock
- Generate reorder alerts
- Log medicine usage
- Maintain stock records
- Expiry date tracking

#### Dashboard Access
- Medicine log dashboard
- Horse health records
- Stock inventory view
- Approval queue
- Health alerts
- Treatment calendar

---

### Role 7: GROOM 🐴

**Position:** Daily Horse Caretaker  
**Department:** Stable Operations  
**Level:** Staff  
**Test Login:** groom@test.com  
**Password:** password123  
**Reports To:** Stable Manager (Emma Manager)

#### Core Responsibilities
- Daily horse care and grooming
- Feeding schedule management
- Stable cleaning and maintenance
- Health observation
- Task execution with documentation
- Equipment maintenance

#### Specific Permissions
✅ **Daily Care:**
- Log feeding activities
- Record grooming sessions
- Document cleaning tasks
- Upload task photos
- Report health issues
- Track daily routines

✅ **Task Execution:**
- View assigned tasks
- Mark tasks in progress
- Complete tasks with photos
- Submit for approval
- Report problems
- Request supplies

✅ **Health Monitoring:**
- Report health concerns
- Log behavioral changes
- Document injuries
- Alert supervisors
- Track appetite changes

#### Dashboard Access
- Daily task list
- Assigned horses
- Feeding schedule
- Task submission form
- Photo upload
- Health report form

---

### Role 8: RIDING BOY 🐴

**Position:** Horse Exercise & Activity Logger  
**Department:** Stable Operations  
**Level:** Staff  
**Test Login:** riding-boy@test.com  
**Password:** password123  
**Reports To:** Stable Manager (Emma Manager)

#### Core Responsibilities
- Horse activity logging
- Exercise session documentation
- Stable maintenance support
- Training assistance
- Equipment care
- Horse assignment tracking

#### Specific Permissions
✅ **Activity Logging:**
- Log horse exercises
- Record activity duration
- Document horse behavior
- Upload session photos
- Track horse assignments
- Submit activity reports

✅ **Support Tasks:**
- Assist with training
- Stable cleaning
- Equipment maintenance
- Horse preparation
- Post-exercise care

#### Dashboard Access
- Daily activity log
- Assigned horses
- Exercise schedule
- Task list
- Photo upload
- Activity reports

---

### Role 9: RIDER 🐴

**Position:** Training Rider  
**Department:** Stable Operations  
**Level:** Staff  
**Test Login:** rider@test.com  
**Password:** password123  
**Reports To:** Stable Manager (Emma Manager)

#### Core Responsibilities
- Training ride execution
- Horse exercise logging
- Stable cleaning duties
- Horse conditioning
- Performance documentation
- Safety compliance

#### Specific Permissions
✅ **Training Activities:**
- Log training rides
- Record horse performance
- Document exercise sessions
- Upload ride photos
- Track progress
- Submit ride reports

✅ **Maintenance Tasks:**
- Stable cleaning
- Equipment care
- Horse preparation
- Post-ride care
- Facility maintenance

#### Dashboard Access
- Training schedule
- Assigned horses
- Ride logs
- Task list
- Performance tracking
- Photo upload

---

### Role 10: FARRIER 🐴

**Position:** Hoof Care Specialist  
**Department:** Stable Operations  
**Level:** Specialist  
**Test Login:** farrier@test.com  
**Password:** password123  
**Reports To:** Stable Manager (Emma Manager)

#### Core Responsibilities
- Hoof care and shoeing
- Farrier visit scheduling
- Hoof health monitoring
- Shoeing records maintenance
- Health record creation
- Equipment tracking

#### Specific Permissions
✅ **Hoof Care:**
- Schedule farrier visits
- Log hoof care sessions
- Record shoeing details
- Upload hoof photos
- Track hoof health
- Document treatments

✅ **Health Records:**
- Create health records
- Log farrier visits
- Document hoof issues
- Track maintenance schedule
- Report hoof problems

#### Dashboard Access
- Visit schedule
- Horse assignment
- Hoof care logs
- Health records
- Visit calendar
- Photo documentation

---

## GROUND OPERATIONS DEPARTMENT

### Role 11: GROUND SUPERVISOR 🚪 (SUPERVISOR)

**Position:** Head of Ground Staff  
**Department:** Ground Operations  
**Level:** Supervisor (Level 2)  
**Test Login:** ground-supervisor@test.com  
**Password:** password123  
**Supervises:** 5 team members

#### Team Members Supervised
1. John Guard (guard@test.com) - Morning Shift
2. David Guard (guard2@test.com) - Evening Shift
3. Robert Electrician (electrician@test.com)
4. Peter Gardener (gardener@test.com)
5. Lisa Housekeeping (housekeeping@test.com)

#### Core Responsibilities
- Ground staff coordination
- Shift scheduling and management
- Maintenance task assignment
- Task approval and review
- Incident management
- Facility upkeep oversight

#### Specific Permissions
✅ **Team Management:**
- View team attendance
- Approve team tasks
- Schedule shifts
- Assign work orders
- Monitor performance
- Handle incidents

✅ **Facility Management:**
- Oversee maintenance
- Review facility conditions
- Approve repairs
- Monitor cleanliness
- Coordinate vendors
- Ensure safety compliance

✅ **Task Coordination:**
- Create maintenance tasks
- Assign to team members
- Review completion
- Approve photo evidence
- Generate reports
- Track completion rates

#### Dashboard Access
- Team management dashboard
- Shift schedule
- Task assignment board
- Attendance records
- Facility status
- Incident reports

---

### Role 12 & 13: GUARD 🚪 (2 Users - Shift-based)

**Position:** Gate Security & Attendance Tracker  
**Department:** Ground Operations  
**Level:** Staff  
**Test Logins:**
- guard@test.com (John Guard - Morning Shift)
- guard2@test.com (David Guard - Evening Shift)

**Password:** password123  
**Reports To:** Ground Supervisor (Mike Supervisor)

#### Core Responsibilities
- Gate attendance logging
- Visitor entry/exit tracking
- Staff attendance monitoring
- Security patrol documentation
- Facility access control
- Incident reporting

#### Specific Permissions
✅ **Gate Attendance:**
- Log staff entry/exit
- Record visitor details
- Track vehicle numbers
- Document entry times
- Log exit times
- Calculate durations

✅ **Visitor Management:**
- Register visitors
- Record purpose of visit
- Track visitor badges
- Log vendor entries
- Monitor contractor access
- Emergency contact logging

✅ **Security Functions:**
- Log shift attendance
- Report incidents
- Document unusual activities
- Access control management
- Patrol logs
- Emergency response

#### Dashboard Access
- Gate attendance log
- Active visitors list
- Shift log
- Incident report form
- Daily summary
- Visitor history

---

### Role 14: ELECTRICIAN 🚪

**Position:** Electrical Maintenance Staff  
**Department:** Ground Operations  
**Level:** Staff  
**Test Login:** electrician@test.com  
**Password:** password123  
**Reports To:** Ground Supervisor (Mike Supervisor)

#### Core Responsibilities
- Electrical system maintenance
- Issue troubleshooting
- Repair documentation
- Safety compliance
- Work order completion
- Equipment maintenance

#### Specific Permissions
✅ **Maintenance Tasks:**
- Log maintenance work
- Track issue reports
- Upload work photos
- Document repairs
- Record equipment checks
- Submit completion reports

✅ **Work Orders:**
- View assigned tasks
- Mark tasks in progress
- Complete with documentation
- Request materials
- Report problems
- Track time spent

#### Dashboard Access
- Work order list
- Task assignment
- Issue tracker
- Photo upload
- Material requests
- Completion reports

---

### Role 15: GARDENER 🚪

**Position:** Grounds Maintenance  
**Department:** Ground Operations  
**Level:** Staff  
**Test Login:** gardener@test.com  
**Password:** password123  
**Reports To:** Ground Supervisor (Mike Supervisor)

#### Core Responsibilities
- Landscape maintenance
- Ground upkeep
- Lawn care
- Plant maintenance
- Task documentation
- Equipment care

#### Specific Permissions
✅ **Grounds Maintenance:**
- Log maintenance activities
- Record lawn care
- Document landscaping
- Upload work photos
- Track plant health
- Submit task reports

✅ **Task Management:**
- View assigned tasks
- Complete daily tasks
- Photo documentation
- Request supplies
- Report issues

#### Dashboard Access
- Daily task list
- Work areas
- Photo upload
- Supply requests
- Task completion
- Maintenance calendar

---

### Role 16: HOUSEKEEPING 🚪

**Position:** Cleaning & Facility Maintenance  
**Department:** Ground Operations  
**Level:** Staff  
**Test Login:** housekeeping@test.com  
**Password:** password123  
**Reports To:** Ground Supervisor (Mike Supervisor)

#### Core Responsibilities
- Facility cleaning
- Sanitation maintenance
- Area inspection
- Supply management
- Task documentation
- Quality assurance

#### Specific Permissions
✅ **Cleaning Tasks:**
- Log cleaning activities
- Document area maintenance
- Upload before/after photos
- Track cleaning schedule
- Report damage
- Submit task completion

✅ **Area Management:**
- Assigned area tracking
- Supply inventory
- Quality checks
- Report issues
- Request materials

#### Dashboard Access
- Cleaning schedule
- Assigned areas
- Task checklist
- Photo upload
- Supply tracking
- Completion reports

---

## ACCOUNTS/ADMINISTRATION DEPARTMENT

### Role 17: SENIOR EXECUTIVE ACCOUNTS 📊 (SUPERVISOR)

**Position:** Head of Accounting  
**Department:** Accounts/Administration  
**Level:** Supervisor (Level 2)  
**Test Login:** senior-accounts@test.com  
**Password:** password123  
**Supervises:** 2 team members

#### Team Members Supervised
1. Charles Executive Accounts (executive-accounts@test.com)
2. Susan Executive Admin (executive-admin@test.com)

#### Core Responsibilities
- Financial oversight
- Bill approval authority
- Team coordination
- Budget monitoring
- Report generation
- Audit compliance

#### Specific Permissions
✅ **Financial Management:**
- Approve bills and expenses
- Review financial reports
- Monitor budget utilization
- Track revenue and expenses
- Generate financial statements
- Export financial data

✅ **Team Management:**
- View team work
- Approve submissions
- Assign tasks
- Monitor performance
- Review documentation

✅ **Reporting:**
- Generate financial reports
- Create expense reports
- Budget vs. actual analysis
- Cash flow reports
- Audit reports

#### Dashboard Access
- Financial dashboard
- Approval queue
- Team overview
- Budget monitoring
- Report generator
- Export tools

---

### Role 18: EXECUTIVE ACCOUNTS 📊

**Position:** Accounts Clerk  
**Department:** Accounts/Administration  
**Level:** Staff  
**Test Login:** executive-accounts@test.com  
**Password:** password123  
**Reports To:** Senior Executive Accounts (Patricia)

#### Core Responsibilities
- Bill creation and tracking
- Expense documentation
- Voucher processing
- Payment tracking
- Financial record keeping
- Invoice management

#### Specific Permissions
✅ **Bill Management:**
- Create bills
- Track expenses
- Process vouchers
- Record payments
- Generate invoices
- Submit for approval

✅ **Documentation:**
- Maintain financial records
- Upload supporting documents
- Track transaction history
- File organization
- Record keeping

#### Dashboard Access
- Bill creation form
- Expense tracker
- Voucher system
- Payment logs
- Document upload
- Approval status

---

### Role 19: EXECUTIVE ADMIN 📊

**Position:** Administrative Assistant  
**Department:** Accounts/Administration  
**Level:** Staff  
**Test Login:** executive-admin@test.com  
**Password:** password123  
**Reports To:** Senior Executive Accounts (Patricia)

#### Core Responsibilities
- Document management
- File organization
- Administrative support
- System organization
- Upload management
- Record maintenance

#### Specific Permissions
✅ **Document Management:**
- Upload documents
- Organize files
- Maintain records
- Archive documents
- Search and retrieval
- Version control

✅ **Administrative Tasks:**
- Calendar management
- Communication support
- Data entry
- Report formatting
- File distribution

#### Dashboard Access
- Document management system
- File upload
- Search interface
- Archive browser
- Organization tools
- Access logs

---

## SUPERVISOR HIERARCHY

### Level 1: Top Leadership (No Supervisor)
- Super Admin (admin@test.com)
- Director (director@test.com)
- School Administrator (school-admin@test.com)

### Level 2: Department Heads (No Supervisor)
- Stable Manager (manager@test.com)
- Ground Supervisor (ground-supervisor@test.com)
- Senior Executive Accounts (senior-accounts@test.com)

### Level 3: Staff with Direct Supervisors

#### Under Stable Manager (Emma Manager):
1. Instructor (James) → instructor@test.com
2. Jamedar (Raj) → jamedar@test.com
3. Groom (Sarah) → groom@test.com
4. Riding Boy (Tommy) → riding-boy@test.com
5. Rider (Alex) → rider@test.com
6. Farrier (Mike) → farrier@test.com

#### Under Ground Supervisor (Mike Supervisor):
1. Guard Morning (John) → guard@test.com
2. Guard Evening (David) → guard2@test.com
3. Electrician (Robert) → electrician@test.com
4. Gardener (Peter) → gardener@test.com
5. Housekeeping (Lisa) → housekeeping@test.com

#### Under Senior Executive Accounts (Patricia):
1. Executive Accounts (Charles) → executive-accounts@test.com
2. Executive Admin (Susan) → executive-admin@test.com

**Total Supervisor-Subordinate Relationships: 13**

---

## TEST USER CREDENTIALS

### Complete User List (19 Users)

#### LEADERSHIP DEPARTMENT
| # | Name | Email | Role | Password | Supervisor |
|---|------|-------|------|----------|-----------|
| 1 | Admin | admin@test.com | Super Admin | password123 | - |
| 2 | Dr. Director | director@test.com | Director | password123 | - |
| 3 | School Administrator | school-admin@test.com | School Admin | password123 | - |

#### STABLE OPERATIONS DEPARTMENT
| # | Name | Email | Role | Password | Supervisor |
|---|------|-------|------|----------|-----------|
| 4 | Emma Manager | manager@test.com | Stable Manager | password123 | - |
| 5 | James Instructor | instructor@test.com | Instructor | password123 | Emma Manager |
| 6 | Raj Jamedar | jamedar@test.com | Jamedar | password123 | Emma Manager |
| 7 | Sarah Groom | groom@test.com | Groom | password123 | Emma Manager |
| 8 | Tommy Riding Boy | riding-boy@test.com | Riding Boy | password123 | Emma Manager |
| 9 | Alex Rider | rider@test.com | Rider | password123 | Emma Manager |
| 10 | Mike Farrier | farrier@test.com | Farrier | password123 | Emma Manager |

#### GROUND OPERATIONS DEPARTMENT
| # | Name | Email | Role | Password | Supervisor |
|---|------|-------|------|----------|-----------|
| 11 | Mike Supervisor | ground-supervisor@test.com | Ground Supervisor | password123 | - |
| 12 | John Guard | guard@test.com | Guard (Morning) | password123 | Mike Supervisor |
| 13 | David Guard | guard2@test.com | Guard (Evening) | password123 | Mike Supervisor |
| 14 | Robert Electrician | electrician@test.com | Electrician | password123 | Mike Supervisor |
| 15 | Peter Gardener | gardener@test.com | Gardener | password123 | Mike Supervisor |
| 16 | Lisa Housekeeping | housekeeping@test.com | Housekeeping | password123 | Mike Supervisor |

#### ACCOUNTS/ADMINISTRATION DEPARTMENT
| # | Name | Email | Role | Password | Supervisor |
|---|------|-------|------|----------|-----------|
| 17 | Patricia | senior-accounts@test.com | Sr. Exec Accounts | password123 | - |
| 18 | Charles | executive-accounts@test.com | Exec Accounts | password123 | Patricia |
| 19 | Susan | executive-admin@test.com | Exec Admin | password123 | Patricia |

---

## QUICK REFERENCE MATRIX

### Permission Matrix

| Permission | Super Admin | Director | School Admin | Stable Mgr | Ground Sup | Sr Accounts | Staff |
|-----------|-------------|----------|--------------|------------|------------|-------------|-------|
| Add Employees | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Employees | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add Horses | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View All Employees | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Team | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Complete Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Log Medicine | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Jamedar only |
| Gate Attendance | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | Guard only |
| Approve Bills | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Create Bills | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | Exec Accounts |

### Feature Access by Role

| Feature | Accessible To |
|---------|---------------|
| Employee Management | Super Admin, Director, School Admin |
| Horse Management | Super Admin, Director, School Admin, Stable Manager, Instructor |
| Team Management | All Supervisory Roles (6 roles) |
| Task Assignment | All Supervisory Roles + Instructor |
| Medicine Logging | Super Admin, Director, School Admin, Stable Manager, Jamedar |
| Gate Attendance | Super Admin, Director, School Admin, Ground Supervisor, Guards |
| Financial Management | Super Admin, Director, School Admin, Senior Exec Accounts |
| Health Records | Super Admin, Director, School Admin, Stable Manager, Instructor, Jamedar, Farrier |
| Reports & Analytics | All Supervisory Roles + Leadership |
| Audit Logs | Super Admin, Director, School Admin |

---

## SYSTEM NOTES

### Default Behaviors
1. **New Employee Default Password:** password123 (user should change on first login)
2. **New Employee Status:** Pending (requires approval by leadership)
3. **Department Assignment:** Auto-assigned based on designation
4. **Supervisor Assignment:** Optional during creation, can be assigned later

### Security Features
- JWT token authentication (7-day expiration)
- Password hashing with bcryptjs
- Role-based access control on all endpoints
- CORS protection
- Audit logging for all actions
- Session management

### Best Practices
1. Change default passwords on first login
2. Assign supervisors during employee creation
3. Approve employees before they start work
4. Regular supervisor relationship reviews
5. Monitor audit logs for security
6. Regular password updates
7. Role assignment accuracy verification

---

## DOCUMENT VERSION CONTROL

**Version:** 1.0  
**Created:** February 8, 2026  
**Last Updated:** February 8, 2026  
**Status:** Active  
**Approved By:** System Administrator

**Change Log:**
- v1.0 (Feb 8, 2026): Initial document creation with all 18 roles documented

---

**END OF DOCUMENT**

For questions or updates, contact the system administrator.
