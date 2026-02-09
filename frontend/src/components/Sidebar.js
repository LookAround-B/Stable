import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();

  // Determine which pages to show based on user role
  const showAttendance = true; // All users
  const showDailyAttendance = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor', 'Jamedar', 'Groom'].includes(user?.designation);
  const showGroomWorksheet = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Groom'].includes(user?.designation);
  const showGateAttendance = user?.designation === 'Guard';
  const showMedicineLogs = user?.designation === 'Jamedar';
  const showCareTeam = user?.designation === 'Stable Manager';

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

        {showAttendance && (
          <li>
            <Link to="/attendance" className="menu-item">
              📋 Attendance
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

        {showGateAttendance && (
          <li>
            <Link to="/gate-attendance" className="menu-item">
              🚪 Gate Log
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
