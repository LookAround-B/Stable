# PRD v2.0 Features - Quick Start Guide

## New Pages Overview

### 1. 📋 Attendance Page
**URL**: `/attendance`  
**Access**: All employees

#### How to Log Attendance
1. Click **"+ Log Attendance"** button
2. Select your time-in and time-out times
3. For Guards and Electricians: Select your shift (Morning/Afternoon/Evening/Night)
4. Add notes if needed
5. Click **"Log Attendance"**

#### For Supervisors
- Can log attendance for team members
- Select employee from dropdown
- Approve pending attendance records from team

#### Tabs Available
- **Recent Attendance**: Shows all logged attendance
- **Status**: Approved/Pending indicator
- **Employee View**: Shows who reported what

---

### 2. 🚪 Gate Attendance & Visitor Log
**URL**: `/gate-attendance`  
**Access**: Guards only

#### Log Staff Entry/Exit
1. Click **"+ Log Staff Entry/Exit"**
2. Select the employee entering/exiting
3. Set entry time (auto-filled with current time)
4. Set exit time (optional, if same log as entry and exit)
5. Select shift (Morning/Afternoon/Evening/Night)
6. Add notes if needed
7. Click **"Log Entry"**

#### Log Visitor
1. Click **"+ Log Visitor"**
2. Enter visitor's full name
3. Enter purpose of visit
4. Enter visitor's contact number (optional)
5. Set entry and exit times
6. Add notes if needed
7. Click **"Log Visitor"**

#### Tabs
- **Staff Entry/Exit**: Track employee access
- **Visitor Log**: Track visitors and their purposes

---

### 3. 💊 Medicine Administration Log
**URL**: `/medicine-logs`  
**Access**: Jamedar only

#### Log Medicine Administration
1. Click **"+ Log Medicine"**
2. Select the horse
3. Enter medicine name (e.g., Penicillin, Vitamin B12)
4. Enter quantity and select unit (ml, g, tablets, drops, injections, ointment)
5. Set time administered
6. Add clinical notes and observations
7. (Optional) Add photo URL of medicine bottle or treatment
8. Click **"Log Medicine"**

#### Tabs
- **All Logs**: View all medicine logs
- **My Logs**: View your own logs
- **Pending Approval**: View logs awaiting Stable Manager approval

#### Stock Alerts
- Medicines used below 20 units trigger alerts
- Check alerts section for replenishment needs

---

### 4. 👥 Horse Care Team Assignment
**URL**: `/horse-care-team`  
**Access**: Stable Manager only

#### Assign Care Team Member
1. Click **"+ Assign Care Team Member"**
2. Select a horse
3. View current horse information (age, breed)
4. Select team role:
   - **Primary Groom**: Groom or Stable Manager
   - **Alternative Groom**: Groom
   - **Rider**: Riding Boy or Rider
   - **Jamedar**: Jamedar
   - **Instructor**: Instructor
5. Select staff member from filtered list
6. Click **"Assign to Team"**

#### View Care Teams
- Card-based view of all horses
- Shows current care team for each horse
- Team member roles clearly displayed
- View unassigned horses

#### Summary Statistics
- Total horses
- Horses with complete teams
- Total team members assigned
- Unassigned horses

---

## Department-Specific Navigation

### Ground Operations Staff
- 📋 **Attendance**: Log your work hours
- 🚪 **Gate Log** (Guards only): Track entry/exit and visitors
- 📈 Reports: View operational reports

### Stable Operations Staff
- 📋 **Attendance**: Log your work hours
- 💊 **Medicine Logs** (Jamedar only): Log medicines
- 👨‍🌾 **Care Teams** (Stable Manager only): Manage horse care assignments
- 🐴 **Horses**: View horse details
- 📈 Reports: View stable reports

### Leadership
- Access to all pages above
- 📊 **Dashboard**: Overview of all operations
- 👥 **Team**: Manage all employees
- ⚙️ **Settings**: System configuration
- 📈 **Reports**: Comprehensive reports

---

## Approval Workflows

### Attendance Approval
```
Employee logs attendance
    ↓
Supervisor reviews
    ↓
Supervisor approves/rejects
    ↓
Status updated to Approved
```

### Medicine Log Approval
```
Jamedar logs medicine
    ↓
Stable Manager reviews pending logs
    ↓
Stable Manager approves/rejects
    ↓
Status updated and records finalized
```

### Gate Attendance Approval
```
Guard logs staff/visitor
    ↓
Ground Supervisor reviews
    ↓
Ground Supervisor approves/rejects
    ↓
Entry/exit confirmed
```

---

## Common Tasks

### As a Guard
1. Log daily staff entry/exit times
2. Log visitor visits with purpose
3. Wait for Ground Supervisor approval

### As Jamedar
1. Log medicine given to each horse
2. Include clinical observations
3. Track stock levels
4. Wait for Stable Manager approval

### As Stable Manager
1. Assign care teams to horses
2. Review and approve medicine logs
3. Manage horse assignments
4. View team assignments

### As Ground Supervisor
1. Log daily attendance for your team
2. Review and approve attendance logs
3. Review and approve gate attendance
4. Monitor staff/visitor access

### As Employee
1. Log your own attendance daily
2. Submit time-in and time-out
3. Add shift information (if required)
4. Wait for supervisor approval

---

## Tips & Best Practices

### Attendance Logging
- ✅ Log attendance immediately after shift starts/ends
- ✅ Include shift information for accurate scheduling
- ✅ Add notes for any issues or delays
- ❌ Don't modify logs retroactively without approval

### Medicine Administration
- ✅ Log medicine immediately after administration
- ✅ Include detailed clinical observations
- ✅ Photograph medicine bottles for records
- ✅ Report stock levels to Stable Manager
- ❌ Don't exceed prescribed dosages

### Gate Attendance
- ✅ Log entry time immediately upon arrival
- ✅ Log exit time upon leaving
- ✅ Request ID from visitors
- ✅ Note unusual activities or concerns
- ❌ Don't allow unauthorized access

### Care Team Assignment
- ✅ Assign based on horse temperament and staff skills
- ✅ Ensure Primary Groom is experienced
- ✅ Update assignments if staff changes
- ✅ Review assignments regularly
- ❌ Don't overload one staff member

---

## Troubleshooting

### Can't access a page?
- Check your role assignment
- Verify with your supervisor
- Ensure you're logged in
- Check department assignment

### Form submission errors?
- Check all required fields are filled
- Verify date/time formats
- Ensure you have necessary permissions
- Check API connection

### Data not saving?
- Verify internet connection
- Check browser console for errors
- Try refreshing the page
- Contact system administrator

### Approval not processing?
- Ensure reviewer is logged in
- Check that they have approval permissions
- Verify email notifications are sent
- Check notification center

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Cancel form | `Esc` |
| Submit form | `Enter` (when focused) |
| Focus search | `Ctrl + F` |

---

## Mobile Access

All pages are fully responsive and work on:
- ✅ Tablets
- ✅ Smartphones
- ✅ Desktop browsers

Optimized layouts automatically adjust for smaller screens.

---

## Data Privacy

- ✅ All data encrypted in transit
- ✅ Passwords securely hashed
- ✅ Access controlled by role
- ✅ Activity logged for audit
- ✅ Regular backups performed

---

## Support & Help

For technical issues or feature requests:
1. Contact your system administrator
2. Check project documentation
3. Review error messages carefully
4. Provide screenshot if reporting issues

---

**Last Updated**: January 19, 2025  
**Version**: 2.0  
**Status**: Production Ready ✅
