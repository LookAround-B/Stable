import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import {
  LayoutDashboard, User, CheckSquare, ClipboardList, ShieldCheck,
  Calendar, Heart, Users, UserCheck, FileText,
  FileEdit, DoorOpen, Pill, HeartHandshake, NotebookPen,
  Receipt, Wheat, Package, ShoppingCart, CreditCard,
  Search, AlertTriangle, BarChart3, Settings, LogOut
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // Determine which pages to show based on user role
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
  const showFines = true;
  const showTasks = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Instructor', 'Ground Supervisor', 'Jamedar'].includes(user?.designation);
  const showApprovals = ['Director', 'School Administrator', 'Stable Manager'].includes(user?.designation);
  const showMyAssignedTasks = true;
  const showMeetings = ['Director', 'School Administrator', 'Stable Manager'].includes(user?.designation);
  const showHorses = user?.designation !== 'Guard';

  // Organize menu items by parent category
  const menuStructure = [
    {
      parent: null, // No section header for these
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      parent: 'Organization',
      items: [
        { to: '/horses', icon: Heart, label: 'Horses', show: showHorses },
        { to: '/employees', icon: Users, label: 'Team', show: true },
      ],
    },
    {
      parent: 'Tasks & Approvals',
      items: [
        { to: '/tasks', icon: CheckSquare, label: 'Tasks', show: showTasks },
        { to: '/my-assigned-tasks', icon: ClipboardList, label: 'My Assigned Tasks', show: showMyAssignedTasks },
        { to: '/pending-approvals', icon: ShieldCheck, label: 'Approvals', show: showApprovals },
        { to: '/meetings', icon: Calendar, label: 'Meetings', show: showMeetings },
      ],
    },
    {
      parent: 'Stable Operations',
      items: [
        { to: '/medicine-logs', icon: Pill, label: 'Medicine Logs', show: showMedicineLogs },
        { to: '/horse-care-team', icon: HeartHandshake, label: 'Care Teams', show: showCareTeam },
        { to: '/medicine-inventory', icon: Pill, label: 'Medicine Inventory', show: showMedicineInventory },
        { to: '/horse-feeds', icon: Wheat, label: 'Horse Feeds', show: showHorseFeeds },
        { to: '/feed-inventory', icon: Package, label: 'Feed Inventory', show: showFeedInventory },
      ],
    },
    {
      parent: 'Ground Operations',
      items: [
        { to: '/gate-entry', icon: DoorOpen, label: 'Gate Register', show: showGateEntry },
        { to: '/daily-attendance', icon: FileText, label: 'Daily Register', show: showDailyAttendance },
        { to: '/team-attendance', icon: UserCheck, label: 'Mark Team Attendance', show: showTeamAttendance },
        { to: '/groom-worksheet', icon: FileEdit, label: 'Groom Worksheet', show: showGroomWorksheet },
        { to: '/daily-work-records', icon: NotebookPen, label: 'Daily Work Records', show: showEIRS },
        { to: '/inspections', icon: Search, label: 'Inspection Rounds', show: showInspections },
      ],
    },
    {
      parent: 'Restaurant Operations',
      items: [
        { to: '/groceries-inventory', icon: ShoppingCart, label: 'Groceries Inventory', show: showGroceriesInventory },
      ],
    },
    {
      parent: 'Accounts & Finance',
      items: [
        { to: '/invoice-generation', icon: Receipt, label: 'Invoice Generation', show: showInvoiceGeneration },
        { to: '/expenses', icon: CreditCard, label: 'Expense Tracking', show: showExpenses },
        { to: '/fines', icon: AlertTriangle, label: 'Fine System', show: showFines },
      ],
    },
    {
      parent: 'System',
      items: [
        { to: '/reports', icon: BarChart3, label: 'Reports', show: true },
        { to: '/settings', icon: Settings, label: 'Settings', show: true },
      ],
    },
  ];

  const MenuItem = ({ to, icon: Icon, label }) => (
    <li>
      <Link to={to} className={`menu-item${isActive(to) ? ' active' : ''}`}>
        <span className="menu-icon-circle"><Icon size={18} strokeWidth={isActive(to) ? 2 : 1.5} /></span>
        <span className="menu-label">{label}</span>
      </Link>
    </li>
  );

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <ul className="sidebar-menu">
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
                  <span className="section-title">{section.parent}</span>
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
        <Link to="/profile" className="floating-user-card sidebar-user-card mobile-only-card" style={{textDecoration:'none', color:'inherit'}}>
          <div className="floating-user-avatar">
            {user.profileImage
              ? <img src={user.profileImage} alt={user.fullName} className="floating-user-avatar-img" />
              : <span className="floating-user-avatar-initial">{(user.fullName || user.name || 'U').charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="floating-user-info">
            <div className="floating-user-name">{user.fullName || user.name || 'User'}</div>
            <div className="floating-user-designation">{user.designation || user.role || 'Staff'}</div>
          </div>
        </Link>
      )}

      {/* Logout — visible on mobile only */}
      <button className="sidebar-logout-btn" onClick={handleLogout}>
        <LogOut size={16} strokeWidth={2} />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
