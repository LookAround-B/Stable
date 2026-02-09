# Quick Testing Checklist

## Pre-Test Setup ✓

### 1. Start Both Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Expected: ✓ Ready in 2.Xs on http://localhost:3000

# Terminal 2 - Frontend  
cd frontend
npm start
# Expected: webpack compiled successfully on http://localhost:3001
```

### 2. Create Test Users (Prisma Studio)
```bash
# Terminal 3
cd backend
npx prisma studio
# Opens http://localhost:5555
```

Create these employees in Prisma Studio:
| Email | Designation | Status | isApproved |
|-------|-------------|--------|-----------|
| groomer@test.com | Groomer | Active | true |
| zamindar@test.com | Zamindar | Active | true |
| instructor@test.com | Instructor | Active | true |
| admin@test.com | Admin | Active | true |
| healthadvisor@test.com | Health Advisor | Active | true |
| superadmin@test.com | Super Admin | Active | true |

---

## Test 1: LOGIN & AUTHENTICATION ✓

### ✅ Test Login as Groomer
```
1. Go to http://localhost:3001/login
2. Email: groomer@test.com
3. Role: Groomer
4. Click Login

PASS if:
□ No error messages
□ Redirects to dashboard
□ Shows "Dashboard - Groomer"
□ URL is http://localhost:3001/
```

### ✅ Test Login as Admin
```
1. Go to http://localhost:3001/login
2. Email: admin@test.com
3. Role: Admin
4. Click Login

PASS if:
□ Redirects to dashboard
□ Shows "Dashboard - Admin"
□ Can see Admin-specific cards
```

### ✅ Test All 6 Roles
Repeat above for:
- [ ] Groomer
- [ ] Zamindar
- [ ] Instructor
- [ ] Admin
- [ ] Health Advisor
- [ ] Super Admin

---

## Test 2: ROLE-SPECIFIC DASHBOARDS ✓

### ✅ Groomer Dashboard
Login as groomer@test.com
```
PASS if you see these cards:
□ My Daily Tasks
□ Completed Today
□ Assigned Horses
```

### ✅ Zamindar Dashboard
Login as zamindar@test.com
```
PASS if you see these cards:
□ My Tasks
□ Pending Approvals
□ Active Horses
□ Team Members
```

### ✅ Instructor Dashboard
Login as instructor@test.com
```
PASS if you see these cards:
□ My Training Tasks
□ Horses in Training
□ Completed This Week
```

### ✅ Admin Dashboard
Login as admin@test.com
```
PASS if you see these cards:
□ Stable Readiness Score
□ Total Horses
□ Total Employees
□ Pending Reports
□ Approvals Pending
```

### ✅ Health Advisor Dashboard
Login as healthadvisor@test.com
```
PASS if you see these cards:
□ Health Records
□ Vaccinations Due
□ Medical Alerts
```

### ✅ Super Admin Dashboard
Login as superadmin@test.com
```
PASS if you see these cards:
□ System Overview
□ Total Horses
□ Total Employees
□ Pending Tasks
□ System Settings
□ Audit Logs
```

---

## Test 3: ROLE-SPECIFIC TASKS ✓

### ✅ Groomer Tasks
Login as groomer@test.com
Go to /tasks
```
PASS if you see:
□ Feed Morning (Feed, High priority)
□ Groom Shadow (Grooming, Medium priority)
□ Clean Stable A (Maintenance, High priority)
□ Exercise Luna (Exercise, Medium priority)

Card should show:
□ Task title
□ Priority badge (color-coded)
□ Status badge (color-coded)
□ Details section
□ "View Details" button
```

### ✅ Zamindar Tasks
Login as zamindar@test.com
Go to /tasks
```
PASS if you see:
□ Create Daily Tasks
□ Review Task Submissions
□ Assign Horses to Team
□ Monitor SLA Compliance

Show different tasks than Groomer
```

### ✅ Other Role Tasks
Test as:
- [ ] Instructor (should see Training, Approval, Performance tasks)
- [ ] Admin (should see Management, Approval, Monitoring tasks)
- [ ] Health Advisor (should see Health, Scheduling, Monitoring tasks)
- [ ] Super Admin (should see Configuration, Security, Maintenance tasks)

### ✅ Task Filtering
Login as Groomer, go to /tasks
```
1. Select "Pending" from status filter
PASS if:
□ Only pending tasks show

2. Select "Completed" filter
PASS if:
□ Only completed tasks show

3. Type in search box
PASS if:
□ Tasks filter by title
```

---

## Test 4: NAVIGATION & ACCESS ✓

### ✅ Groomer Navigation
Login as groomer@test.com
```
Can access:
□ Dashboard (/)
□ Horses (/horses)
□ Tasks (/tasks)
□ Employees (/employees)

Cannot access:
□ Settings (/settings) - should show 404 or redirect
```

### ✅ Admin Navigation
Login as admin@test.com
```
Can access ALL pages:
□ Dashboard (/)
□ Horses (/horses)
□ Tasks (/tasks)
□ Employees (/employees)
□ Reports (/reports)
□ Settings (/settings)
□ Approvals (if available)
```

### ✅ Health Advisor Navigation
Login as healthadvisor@test.com
```
Can access:
□ Dashboard (/)
□ Horses (/horses)
□ Tasks (/tasks)
□ Employees (view only)

Cannot access:
□ Reports
□ Settings
```

---

## Test 5: API ENDPOINTS ✓

### ✅ Test Login API
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"groomer@test.com","designation":"Groomer"}'
```

PASS if response contains:
```json
{
  "token": "eyJ...",
  "user": {
    "id": "...",
    "email": "groomer@test.com",
    "designation": "Groomer"
  }
}
```

### ✅ Test Get Current User API
```bash
# Get token from previous test, then:
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

PASS if returns user object with:
- [ ] id
- [ ] email
- [ ] fullName
- [ ] designation

### ✅ Test CORS Headers
```bash
curl -i http://localhost:3000/api/horses \
  -H "Authorization: Bearer <TOKEN>"
```

PASS if response includes:
- [ ] `Access-Control-Allow-Origin: http://localhost:3001`
- [ ] `Access-Control-Allow-Credentials: true`

---

## Test 6: BROWSER CONSOLE ✓

### ✅ Check for Errors
Login to application and check browser console (F12)

PASS if:
```
□ No red errors in Console tab
□ No 404s in Network tab
□ No CORS errors
□ Token is in Local Storage (Storage tab)
```

---

## Test 7: DATABASE ✓

### ✅ Verify Data in Database
```bash
# In Prisma Studio (http://localhost:5555)
Click "Employee" table
```

PASS if:
```
□ All 6 test users exist
□ Each has correct email
□ Each has correct designation
□ isApproved = true
□ employmentStatus = Active
```

### ✅ Verify JWT Token
```
1. Login to app
2. Open DevTools (F12)
3. Go to "Storage" → "Local Storage" → "http://localhost:3001"
4. Find "token" key
5. Copy the token value
6. Go to https://jwt.io
7. Paste token
```

PASS if:
```
□ Token decodes without error
□ Contains "id" field
□ Contains "email" field  
□ Contains "designation" field
□ Contains "exp" (expiration) field
```

---

## Test 8: END-TO-END WORKFLOW ✓

### ✅ Complete Groomer Workflow
```
1. Login as groomer@test.com
2. Go to Dashboard - verify groomer cards show
3. Go to /tasks - verify groomer tasks show
4. Click on one task - verify details show (if implemented)
5. Logout and login again - verify session persists
6. Verify token is still in localStorage
```

PASS if all steps complete without errors

### ✅ Complete Admin Workflow
```
1. Login as admin@test.com
2. Go to Dashboard - verify admin cards show
3. Go to /employees - verify employee list loads
4. Go to /reports - verify reports page loads
5. Go to /settings - verify settings loads (even if empty)
6. Navigate between all pages without errors
```

PASS if all navigation works

---

## Test 9: SECURITY ✓

### ✅ Test Logout
```
1. Login as any user
2. Click Logout button (if available)
3. Try to access dashboard without logging in
```

PASS if:
```
□ Token removed from localStorage
□ Redirected to login page
□ Cannot access protected routes
```

### ✅ Test Invalid Token
```bash
curl http://localhost:3000/api/horses \
  -H "Authorization: Bearer invalid123"
```

PASS if:
```
Response is 401 or 403 (not 200)
```

---

## Summary Report

### Overall Status: ___________

**Tests Passed**: ______ / 50+

**Issues Found**:
1. 
2.
3.

**Notes**:


---

## If Tests FAIL

### Check These:

1. **Backend not running?**
   ```bash
   cd backend && npm run dev
   ```

2. **Frontend not running?**
   ```bash
   cd frontend && npm start
   ```

3. **Test users not in database?**
   ```bash
   # Create in Prisma Studio
   cd backend && npx prisma studio
   ```

4. **CORS errors?**
   - Make sure both servers are running
   - Check middleware.ts has correct origins

5. **Compilation errors?**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd backend && npm install
   ```

6. **Port conflicts?**
   - Check if ports 3000, 3001 are already in use
   - Kill conflicting processes: `netstat -ano`

---

**Last Updated**: Feb 5, 2026
**Test Environment**: Windows 10, Node.js, PostgreSQL
