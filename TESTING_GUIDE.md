# Testing Guide - Stable Management System

## Quick Test Checklist

### ✅ Environment Setup
- [ ] Backend running on http://localhost:3000
- [ ] Frontend running on http://localhost:3001
- [ ] PostgreSQL database connected
- [ ] Prisma migrations applied

### ✅ Core Functionality Tests

---

## 1. AUTHENTICATION & LOGIN TESTS

### 1.1 Login with Different Roles

**Test Case: Login as Groomer**
```
Steps:
1. Navigate to http://localhost:3001/login
2. Enter email: groomer@test.com
3. Select role: "Groomer"
4. Click Login

Expected Results:
✓ Login succeeds
✓ Redirected to Dashboard
✓ Dashboard shows "Dashboard - Groomer"
✓ Cards show: My Daily Tasks, Completed Today, Assigned Horses
```

**Test Case: Login as Zamindar**
```
Steps:
1. Navigate to http://localhost:3001/login
2. Enter email: zamindar@test.com
3. Select role: "Zamindar"
4. Click Login

Expected Results:
✓ Login succeeds
✓ Dashboard shows "Dashboard - Zamindar"
✓ Cards show: My Tasks, Pending Approvals, Active Horses, Team Members
```

**Test Case: Login as Admin**
```
Steps:
1. Navigate to http://localhost:3001/login
2. Enter email: admin@test.com
3. Select role: "Admin"
4. Click Login

Expected Results:
✓ Login succeeds
✓ Dashboard shows "Dashboard - Admin"
✓ Cards show: Stable Readiness, Total Horses, Total Employees, Pending Reports
```

**Test Case: Login as Health Advisor**
```
Steps:
1. Navigate to http://localhost:3001/login
2. Enter email: healthadvisor@test.com
3. Select role: "Health Advisor"
4. Click Login

Expected Results:
✓ Login succeeds
✓ Dashboard shows "Dashboard - Health Advisor"
✓ Cards show: Health Records, Vaccinations Due, Medical Alerts
```

### 1.2 JWT Token Verification
```
Steps:
1. Login as any user
2. Open Browser DevTools (F12)
3. Go to Storage → Local Storage
4. Check if "token" is stored

Expected Results:
✓ Token exists in localStorage
✓ Token is a valid JWT (jwt.io can decode it)
✓ Token contains: id, email, designation, iat, exp
```

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC) TESTS

### 2.1 Navigation & Page Access

**Test Case: Groomer Page Access**
```
Steps:
1. Login as Groomer
2. Try to navigate to:
   - /horses (should show horses)
   - /tasks (should show groomer tasks only)
   - /employees (should show employees)
   - /reports (should show or deny access)
   - /settings (should deny access)

Expected Results:
✓ Groomer can access: Horses, Tasks, Employees, Dashboard
✓ Groomer cannot access: Settings (should redirect to 404)
```

**Test Case: Admin Page Access**
```
Steps:
1. Login as Admin
2. Try to navigate to all pages:
   - /horses, /tasks, /employees, /reports, /settings

Expected Results:
✓ Admin can access ALL pages
✓ Admin dashboard shows all metrics
```

### 2.2 Task Assignment by Role

**Test Case: Only Zamindar/Admin can create tasks**
```
Browser DevTools:
1. Login as Groomer
2. Open Network tab (F12)
3. Check if "Create Task" button exists
4. Try to POST to http://localhost:3000/api/tasks

Expected Results:
✓ Groomer doesn't see "Create Task" button
✓ If they try to POST, API returns 403 Forbidden
```

---

## 3. DASHBOARD TESTS

### 3.1 Role-Specific Dashboard Content

**Test Case: Verify Dashboard Cards by Role**

Login as each role and verify dashboard cards:

| Role | Expected Cards |
|------|----------------|
| Groomer | My Daily Tasks, Completed Today, Assigned Horses |
| Zamindar | My Tasks, Pending Approvals, Active Horses, Team Members |
| Instructor | Training Tasks, Horses in Training, Completed This Week |
| Admin | Readiness Score, Total Horses, Total Employees, Pending Reports |
| Health Advisor | Health Records, Vaccinations Due, Medical Alerts |
| Super Admin | System Overview, Horses, Employees, Pending Tasks, Settings |

```
Steps:
1. Login as Groomer
2. Verify card titles match above
3. Logout, Login as Zamindar
4. Verify different card titles
5. Repeat for all roles

Expected Results:
✓ Each role sees ONLY their relevant cards
✓ Dashboard title shows correct role
✓ Cards contain correct metrics
```

---

## 4. TASK PAGE TESTS

### 4.1 Role-Specific Tasks

**Test Case: Tasks vary by role**
```
Steps:
1. Login as Groomer
2. Go to /tasks
3. Note the tasks shown (should be grooming-related)
4. Logout, Login as Zamindar
5. Go to /tasks
6. Note the tasks shown (should be management-related)

Expected Results:
✓ Groomer sees: Feed Morning, Groom Shadow, Clean Stable, Exercise Luna
✓ Zamindar sees: Create Daily Tasks, Review Submissions, Assign Horses, Monitor SLA
✓ Instructor sees: Training Programs, Approve Submissions, Performance Review
✓ Admin sees: Manage Employees, Final Approvals, System Monitoring
✓ Health Advisor sees: Record Vaccinations, Schedule Vet Visits, Monitor Health
```

### 4.2 Task Filtering & Search

**Test Case: Filter tasks by status**
```
Steps:
1. Login as Groomer
2. Go to /tasks
3. Select filter: "Pending"
4. Verify only pending tasks show

Expected Results:
✓ Filter dropdown works
✓ Tasks filter correctly
✓ Search box filters by title
```

---

## 5. API ENDPOINT TESTS

### 5.1 Testing with cURL/Postman

**Test Case: Login Endpoint**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","designation":"Groomer"}'

Expected Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "designation": "Groomer",
    "fullName": "Test User",
    "isApproved": false
  }
}
```

**Test Case: Get Current User**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"

Expected Response (200):
{
  "id": "uuid",
  "email": "test@example.com",
  "fullName": "Test User",
  "designation": "Groomer"
}
```

**Test Case: Get Horses (All roles can access)**
```bash
curl http://localhost:3000/api/horses \
  -H "Authorization: Bearer <token>"

Expected Response (200):
[]
```

**Test Case: Create Horse (Only Admin/Zamindar)**
```bash
# As Groomer (should fail)
curl -X POST http://localhost:3000/api/horses \
  -H "Authorization: Bearer <groomer_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Shadow","gender":"Male"}'

Expected Response: 403 Forbidden

# As Zamindar (should succeed)
curl -X POST http://localhost:3000/api/horses \
  -H "Authorization: Bearer <zamindar_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Shadow","gender":"Male"}'

Expected Response (201): Created successfully
```

---

## 6. DATABASE TESTS

### 6.1 Verify Data Persistence

**Test Case: Check Employee in Database**
```
Steps:
1. Login as Groomer (creates employee)
2. Open Prisma Studio:
   cd backend
   npx prisma studio

3. Navigate to Employee table
4. Search for groomer@test.com

Expected Results:
✓ Employee record exists
✓ designation = "Groomer"
✓ email matches login email
✓ isApproved field exists
```

### 6.2 Verify Relationships

```
In Prisma Studio:
1. Click on an Employee
2. Check if relationships load:
   - assignedTasks
   - healthRecords
   - createdApprovals
   - auditLogs

Expected Results:
✓ All relationships accessible
✓ Can navigate to related records
```

---

## 7. CORS & CONNECTIVITY TESTS

### 7.1 CORS Headers

**Test Case: Verify CORS headers**
```bash
curl -i http://localhost:3000/api/auth/login \
  -H "Origin: http://localhost:3001"

Expected Headers:
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

### 7.2 Frontend-Backend Communication

**Test Case: Network Requests**
```
Steps:
1. Login (any role)
2. Open DevTools (F12) → Network tab
3. Refresh page
4. Check network requests

Expected Results:
✓ POST /api/auth/me returns 200
✓ All requests include Authorization header
✓ No CORS errors
✓ API responses are JSON
```

---

## 8. WORKFLOW TESTS

### 8.1 Complete Task Workflow (Groomer → Zamindar → Admin)

**Test Case: Task Submission Flow**
```
Step 1: Admin Creates Task
  - Login as Admin
  - Go to Tasks page
  - Create task: "Groom Horse Shadow"
  - Assign to Groomer

Step 2: Groomer Executes Task
  - Logout, Login as Groomer
  - Go to Tasks
  - See newly created task
  - Click "View Details"
  - Mark task as "In Progress"

Step 3: Groomer Submits Task
  - Complete task
  - Upload proof image (if available)
  - Submit for approval

Step 4: Zamindar Reviews
  - Logout, Login as Zamindar
  - Go to Approvals page
  - See pending groomer submission
  - Review and Approve

Step 5: Task Completed
  - Logout, Login as Groomer
  - Task should show as "Completed"

Expected Results:
✓ Each step succeeds
✓ Task status changes appropriately
✓ Notifications sent at each stage
```

---

## 9. EDGE CASES & ERROR HANDLING

### 9.1 Invalid Token

**Test Case: Access API with expired token**
```bash
# Use a fake token
curl http://localhost:3000/api/horses \
  -H "Authorization: Bearer invalid.token.here"

Expected Response (401):
{
  "error": "Invalid token"
}
```

### 9.2 Missing Required Fields

**Test Case: Login without email**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"designation":"Groomer"}'

Expected Response (400):
{
  "error": "Email is required"
}
```

### 9.3 Unauthorized Access

**Test Case: Groomer tries to delete horse**
```bash
curl -X DELETE http://localhost:3000/api/horses/123 \
  -H "Authorization: Bearer <groomer_token>"

Expected Response (403):
{
  "error": "Forbidden: insufficient permissions"
}
```

---

## 10. PERFORMANCE TESTS

### 10.1 Load Times

**Test Case: Frontend Load Time**
```
Steps:
1. Open DevTools (F12) → Performance tab
2. Record page load
3. Check metrics

Expected Results:
✓ Page loads in < 3 seconds
✓ First Contentful Paint < 2 seconds
✓ No JavaScript errors in console
```

### 10.2 Database Query Performance

```
In Prisma Studio:
1. Click on Employees table
2. Load list of all employees
3. Check query time

Expected Results:
✓ Query completes in < 500ms
✓ No N+1 query problems
```

---

## 11. SECURITY TESTS

### 11.1 XSS Protection

**Test Case: Attempt XSS in task title**
```
Steps:
1. Login as Admin
2. Create task with title: `<img src=x onerror=alert('XSS')>`
3. View task

Expected Results:
✓ No alert appears
✓ Malicious code is escaped/sanitized
```

### 11.2 SQL Injection Prevention

**Test Case: Try SQL injection in search**
```
Steps:
1. Go to /tasks
2. Search for: ' OR 1=1 --
3. Check network request

Expected Results:
✓ Search treats as literal text
✓ No database error messages exposed
✓ Prisma ORM prevents injection
```

---

## 12. BROWSER COMPATIBILITY

**Test Case: Cross-browser testing**
```
Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)

Expected Results:
✓ Login works
✓ Dashboard displays correctly
✓ All buttons clickable
✓ Forms submittable
✓ No layout issues
```

---

## Quick Start Testing Script

```bash
# 1. Ensure backend is running
cd backend
npm run dev
# Should see: ✓ Ready in X.Xs

# 2. Ensure frontend is running (new terminal)
cd frontend
npm start
# Should see: webpack compiled successfully

# 3. Open browser
http://localhost:3001/login

# 4. Test login (create with Prisma first)
# Backend terminal:
cd backend
npx prisma studio
# Create employee: groomer@test.com, designation: Groomer, isApproved: true

# 5. Login and verify dashboard
# Frontend: Enter groomer@test.com, select Groomer, click Login
# Should see Groomer-specific dashboard

# 6. Test API endpoint
curl http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"groomer@test.com","designation":"Groomer"}'
```

---

## Success Criteria

✅ **All the following should work**:
- [ ] Login with all 6 roles
- [ ] Each role sees correct dashboard
- [ ] Each role sees correct tasks
- [ ] API endpoints return correct responses
- [ ] CORS headers present
- [ ] Database stores data correctly
- [ ] No JavaScript console errors
- [ ] No 404 or 500 errors
- [ ] Role-based access control enforced
- [ ] Forms submit and validate
