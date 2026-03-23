import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import {
  LayoutDashboard, CheckSquare, ClipboardList, ShieldCheck,
  Calendar, Users, UserCheck, FileText,
  FileEdit, DoorOpen, Pill, HeartHandshake, NotebookPen,
  Receipt, Wheat, Package, ShoppingCart, CreditCard,
  Search, AlertTriangle, BarChart3, Settings, LogOut, Shield, Hammer,
  Brush, Network
} from 'lucide-react';
import { FaHorse } from 'react-icons/fa';

const Sidebar = ({ isOpen, onClose }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const p = usePermissions();

  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 0);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // Organize menu items by parent category
  const menuStructure = [
    {
      parent: null,
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', show: p.viewDashboard },
      ],
    },
    {
      parent: 'Organization',
      items: [
        { to: '/horses', icon: FaHorse, label: 'Horses', show: p.viewHorses },
        { to: '/employees', icon: Users, label: 'Team', show: p.manageEmployees },
      ],
    },
    {
      parent: 'Tasks & Approvals',
      items: [
        { to: '/tasks', icon: CheckSquare, label: 'Tasks', show: p.manageTasks },
        { to: '/my-assigned-tasks', icon: ClipboardList, label: 'My Assigned Tasks', show: true },
        { to: '/pending-approvals', icon: ShieldCheck, label: 'Approvals', show: p.viewApprovals },
        { to: '/meetings', icon: Calendar, label: 'Meetings', show: p.viewMeetings },
      ],
    },
    {
      parent: 'Stable Operations',
      items: [
        { to: '/medicine-logs', icon: Pill, label: 'Medicine Logs', show: p.viewMedicineLogs },
        { to: '/horse-care-team', icon: HeartHandshake, label: 'Care Teams', show: false },
        { to: '/medicine-inventory', icon: Pill, label: 'Medicine Inventory', show: p.viewMedicineInventory },
        { to: '/horse-feeds', icon: Wheat, label: 'Horse Feeds', show: p.viewHorseFeeds },
        { to: '/feed-inventory', icon: Package, label: 'Feed Inventory', show: p.viewFeedInventory },
        { to: '/farrier-shoeing', icon: Hammer, label: 'Farrier Shoeing', show: p.viewFarrierShoeing },
        { to: '/tack-inventory', icon: Package, label: 'Tack Inventory', show: p.viewTackInventory },
        { to: '/farrier-inventory', icon: Hammer, label: 'Farrier Inventory', show: p.viewFarrierInventory },
      ],
    },
    {
      parent: 'Ground Operations',
      items: [
        { to: '/gate-entry', icon: DoorOpen, label: 'Gate Register', show: p.viewGateEntry },
        { to: '/daily-attendance', icon: FileText, label: 'Daily Register', show: p.viewDailyAttendance },
        { to: '/team-attendance', icon: UserCheck, label: 'Mark Team Attendance', show: p.viewTeamAttendance },
        { to: '/groom-worksheet', icon: FileEdit, label: 'Groom Worksheet', show: p.viewGroomWorksheet },
        { to: '/work-records', icon: FileEdit, label: 'Work Record', show: p.viewGroomWorksheet },
        { to: '/daily-work-records', icon: NotebookPen, label: 'Daily Work Records', show: p.viewEIRS },
        { to: '/inspections', icon: Search, label: 'Inspection Rounds', show: p.viewInspections },
        { to: '/housekeeping-inventory', icon: Brush, label: 'Housekeeping Inventory', show: p.viewHousekeepingInventory },
      ],
    },
    {
      parent: 'Restaurant Operations',
      items: [
        { to: '/groceries-inventory', icon: ShoppingCart, label: 'Groceries Inventory', show: p.viewGroceriesInventory },
      ],
    },
    {
      parent: 'Accounts & Finance',
      items: [
        { to: '/invoice-generation', icon: Receipt, label: 'Invoice Generation', show: p.viewInvoiceGeneration },
        { to: '/expenses', icon: CreditCard, label: 'Expense Tracking', show: p.viewExpenses },
        { to: '/fines', icon: AlertTriangle, label: 'Fine System', show: p.viewFines },
      ],
    },
    {
      parent: 'System',
      items: [
        { to: '/reports', icon: BarChart3, label: 'Reports', show: p.viewReports },
        { to: '/permissions', icon: Shield, label: 'Permissions', show: p.viewPermissions },
        { to: '/settings', icon: Settings, label: 'Settings', show: false },
        { to: '/entity-map', icon: Network, label: 'Entity Map', show: p.viewDashboard },
      ],
    },
  ];

  const MenuItem = ({ to, icon: Icon, label }) => {
    // All icons are Lucide now; no FontAwesome check needed

    return (
      <li>
        <Link to={to} className={`menu-item${isActive(to) ? ' active' : ''}`}>
          <span className="menu-icon-circle">
            <Icon size={18} strokeWidth={isActive(to) ? 2 : 1.5} />
          </span>
          <span className="menu-label">{t(label)}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className={`sidebar-logo ${isScrolled ? 'scrolled' : ''}`}>
        <div className="logo-icon"></div>
        <span className="sidebar-logo-text">EFM</span>
      </div>
      <ul className="sidebar-menu" onScroll={handleScroll}>
        {menuStructure.map((section, idx) => {
          // Filter items that should be shown
          const visibleItems = section.items.filter(item => item.show !== false);

          // Skip sections with no visible items
          if (visibleItems.length === 0) return null;

          return (
            <React.Fragment key={idx}>
              {/* Section header (if parent exists) */}
              {section.parent && (
                <li className="menu-section">
                  <span className="section-title">{t(section.parent)}</span>
                </li>
              )}

              {/* Menu items */}
              {visibleItems.map((item, itemIdx) => (
                <MenuItem
                  key={itemIdx}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
            </React.Fragment>
          );
        })}
      </ul>

      {/* User card — only shown inside sidebar on mobile, clickable to go to /profile */}
      {user && (
        <Link to="/profile" className="floating-user-card sidebar-user-card mobile-only-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="floating-user-avatar">
            {user.profileImage
              ? <img src={user.profileImage} alt={user.fullName} className="floating-user-avatar-img" />
              : <span className="floating-user-avatar-initial">{(user.fullName || user.name || 'U').charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="floating-user-info">
            <div className="floating-user-name">{user.fullName || user.name || 'User'}</div>
            <div className="floating-user-designation">{t(user.designation || user.role || 'Staff')}</div>
          </div>
        </Link>
      )}

      {/* Logout — visible on mobile only */}
      <button className="sidebar-logout-btn" onClick={handleLogout}>
        <LogOut size={16} strokeWidth={2} />
        {t('Logout')}
      </button>
    </aside>
  );
};

export default Sidebar;
