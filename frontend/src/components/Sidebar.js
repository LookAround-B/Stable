import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();

  // Determine which pages to show based on user role
  const showPersonalAttendance = false; // Removed - supervisors cannot self-mark
  const showTeamAttendance = ['Super Admin', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);
  const showDailyAttendance = ['Super Admin', 'Director', 'School Administrator', 'Ground Supervisor', 'Groom'].includes(user?.designation);
  const showGroomWorksheet = ['Super Admin', 'Director', 'School Administrator', 'Groom'].includes(user?.designation);
  const showGateEntry = user?.designation === 'Guard' || ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);
  const showMedicineLogs = user?.designation === 'Jamedar';
  const showCareTeam = false;
  const showEIRS = user?.designation === 'Instructor';
  const showInvoiceGeneration = user?.designation === 'Stable Manager' || ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const showHorseFeeds = ['Stable Manager', 'Ground Supervisor', 'Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const showExpenses = user?.designation === 'Senior Executive - Accounts' || ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);

  return (
    <aside className="sidebar">
      <ul className="sidebar-menu">
        <li>
          <Link to="/" className="menu-item">
            📊 Dashboard
          </Link>
        </li>
        <li>
          <Link to="/tasks" className="menu-item">
            ✓ My Tasks
          </Link>
        </li>
        <li>
          <Link to="/horses" className="menu-item">
            🐴 Horses
          </Link>
        </li>
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

        {showExpenses && (
          <li>
            <Link to="/expenses" className="menu-item">
              💳 Expense Tracking
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
