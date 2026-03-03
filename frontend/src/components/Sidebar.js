import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  // Determine which pages to show based on user role
  const showPersonalAttendance = false; // Removed - supervisors cannot self-mark
  const showTeamAttendance = ['Super Admin', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);
  const showDailyAttendance = ['Super Admin', 'Director', 'School Administrator', 'Ground Supervisor', 'Groom'].includes(user?.designation);
  const showGroomWorksheet = ['Super Admin', 'Director', 'School Administrator', 'Groom'].includes(user?.designation);
  const showGateEntry = user?.designation === 'Guard' || ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);
  const showMedicineLogs = user?.designation === 'Jamedar' || ['Stable Manager', 'Director', 'Super Admin', 'School Administrator'].includes(user?.designation);
  const showCareTeam = false;
  const showEIRS = ['Instructor', 'Riding Boy', 'Rider', 'Groom'].includes(user?.designation);
  const showInvoiceGeneration = user?.designation === 'Stable Manager' || ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const showHorseFeeds = ['Stable Manager', 'Ground Supervisor', 'Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const showFeedInventory = ['Stable Manager', 'Ground Supervisor', 'Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const showMedicineInventory = ['Stable Manager', 'Super Admin', 'Director', 'School Administrator', 'Jamedar'].includes(user?.designation);
  const showGroceriesInventory = ['Senior Executive Admin', 'Junior Executive Admin', 'Restaurant Manager'].includes(user?.designation);
  const showExpenses = ['Senior Executive Accounts', 'Executive Accounts'].includes(user?.designation) || ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const showInspections = user?.designation === 'Jamedar' || ['Super Admin', 'Director', 'School Administrator', 'Stable Manager'].includes(user?.designation);
  const showFines = true; // Everyone can see their fines
  const showTasks = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Instructor', 'Ground Supervisor', 'Jamedar'].includes(user?.designation); // Roles that can create/assign tasks
  const showApprovals = ['Director', 'School Administrator', 'Stable Manager'].includes(user?.designation); // Parent roles approve tasks
  const showMyAssignedTasks = true; // Everyone can see tasks assigned to them
  const showMeetings = ['Director', 'School Administrator', 'Stable Manager'].includes(user?.designation); // Only parent roles can create meetings
  const showHorses = user?.designation !== 'Guard'; // Guards cannot access horse data


  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <ul className="sidebar-menu">
        <li>
          <Link to="/" className="menu-item">
            📊 Dashboard
          </Link>
        </li>
        <li>
          <Link to="/profile" className="menu-item">
            👤 My Profile
          </Link>
        </li>
        {showTasks && (
          <li>
            <Link to="/tasks" className="menu-item">
              ✓ Tasks
            </Link>
          </li>
        )}
        {showMyAssignedTasks && (
          <li>
            <Link to="/my-assigned-tasks" className="menu-item">
              📝 My Assigned Tasks
            </Link>
          </li>
        )}
        {showApprovals && (
          <li>
            <Link to="/pending-approvals" className="menu-item">
              ✅ Approvals
            </Link>
          </li>
        )}
        {showMeetings && (
          <li>
            <Link to="/meetings" className="menu-item">
              📅 Meetings
            </Link>
          </li>
        )}
        {showHorses && (
          <li>
            <Link to="/horses" className="menu-item">
              🐴 Horses
            </Link>
          </li>
        )}
        <li>
          <Link to="/employees" className="menu-item">
            👥 Team
          </Link>
        </li>

        {/* PRD v2.0 Feature Pages */}
        <li className="menu-section">
          <span className="section-title">Operations</span>
        </li>

        {showPersonalAttendance && (
          <li>
            <Link to="/digital-attendance" className="menu-item">
              📋 My Attendance
            </Link>
          </li>
        )}

        {showTeamAttendance && (
          <li>
            <Link to="/team-attendance" className="menu-item">
              👥 Mark Team Attendance
            </Link>
          </li>
        )}

        {showDailyAttendance && (
          <li>
            <Link to="/daily-attendance" className="menu-item">
              📋 Daily Register
            </Link>
          </li>
        )}

        {showGroomWorksheet && (
          <li>
            <Link to="/groom-worksheet" className="menu-item">
              📝 Groom Worksheet
            </Link>
          </li>
        )}

        {showGateEntry && (
          <li>
            <Link to="/gate-entry" className="menu-item">
              🚪 Gate Register
            </Link>
          </li>
        )}

        {showMedicineLogs && (
          <li>
            <Link to="/medicine-logs" className="menu-item">
              💊 Medicine Logs
            </Link>
          </li>
        )}

        {showCareTeam && (
          <li>
            <Link to="/horse-care-team" className="menu-item">
              👨‍🌾 Care Teams
            </Link>
          </li>
        )}

        {showEIRS && (
          <li>
            <Link to="/daily-work-records" className="menu-item">
              📝 Daily Work Records
            </Link>
          </li>
        )}

        {showInvoiceGeneration && (
          <li>
            <Link to="/invoice-generation" className="menu-item">
              💰 Invoice Generation
            </Link>
          </li>
        )}

        {showHorseFeeds && (
          <li>
            <Link to="/horse-feeds" className="menu-item">
              🥕 Horse Feeds
            </Link>
          </li>
        )}

        {showFeedInventory && (
          <li>
            <Link to="/feed-inventory" className="menu-item">
              📦 Feed Inventory
            </Link>
          </li>
        )}

        {showMedicineInventory && (
          <li>
            <Link to="/medicine-inventory" className="menu-item">
              💊 Medicine Inventory
            </Link>
          </li>
        )}

        {showGroceriesInventory && (
          <li>
            <Link to="/groceries-inventory" className="menu-item">
              🛒 Groceries Inventory
            </Link>
          </li>
        )}

        {showExpenses && (
          <li>
            <Link to="/expenses" className="menu-item">
              💳 Expense Tracking
            </Link>
          </li>
        )}

        {showInspections && (
          <li>
            <Link to="/inspections" className="menu-item">
              🔍 Inspection Rounds
            </Link>
          </li>
        )}

        {showFines && (
          <li>
            <Link to="/fines" className="menu-item">
              ⚠️ Fine System
            </Link>
          </li>
        )}



        <li>
          <Link to="/reports" className="menu-item">
            📈 Reports
          </Link>
        </li>
        <li>
          <Link to="/settings" className="menu-item">
            ⚙️ Settings
          </Link>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
