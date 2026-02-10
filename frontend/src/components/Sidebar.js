import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

const Sidebar = () => {
  const { user } = useAuth();

  // Determine which pages to show based on user role
  const showPersonalAttendance = false; // Removed - supervisors cannot self-mark
  const showTeamAttendance = ['Super Admin', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);
  const showDailyAttendance = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);
  const showGroomWorksheet = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Groom'].includes(user?.designation);
  const showGateEntry = user?.designation === 'Guard' || ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);
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
