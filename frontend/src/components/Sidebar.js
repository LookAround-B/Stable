import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, CheckSquare, ClipboardList, ShieldCheck,
  Calendar, Heart, Users, Clipboard, UserCheck, FileText,
  FileEdit, DoorOpen, Pill, HeartHandshake, NotebookPen,
  Receipt, Wheat, Package, ShoppingCart, CreditCard,
  Search, AlertTriangle, BarChart3, Settings
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  // Determine which pages to show based on user role
  const showPersonalAttendance = false;
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
        <MenuItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <MenuItem to="/profile" icon={User} label="My Profile" />
        {showTasks && <MenuItem to="/tasks" icon={CheckSquare} label="Tasks" />}
        {showMyAssignedTasks && <MenuItem to="/my-assigned-tasks" icon={ClipboardList} label="My Assigned Tasks" />}
        {showApprovals && <MenuItem to="/pending-approvals" icon={ShieldCheck} label="Approvals" />}
        {showMeetings && <MenuItem to="/meetings" icon={Calendar} label="Meetings" />}
        {showHorses && <MenuItem to="/horses" icon={Heart} label="Horses" />}
        <MenuItem to="/employees" icon={Users} label="Team" />

        <li className="menu-section">
          <span className="section-title">Operations</span>
        </li>

        {showPersonalAttendance && <MenuItem to="/digital-attendance" icon={Clipboard} label="My Attendance" />}
        {showTeamAttendance && <MenuItem to="/team-attendance" icon={UserCheck} label="Mark Team Attendance" />}
        {showDailyAttendance && <MenuItem to="/daily-attendance" icon={FileText} label="Daily Register" />}
        {showGroomWorksheet && <MenuItem to="/groom-worksheet" icon={FileEdit} label="Groom Worksheet" />}
        {showGateEntry && <MenuItem to="/gate-entry" icon={DoorOpen} label="Gate Register" />}
        {showMedicineLogs && <MenuItem to="/medicine-logs" icon={Pill} label="Medicine Logs" />}
        {showCareTeam && <MenuItem to="/horse-care-team" icon={HeartHandshake} label="Care Teams" />}
        {showEIRS && <MenuItem to="/daily-work-records" icon={NotebookPen} label="Daily Work Records" />}
        {showInvoiceGeneration && <MenuItem to="/invoice-generation" icon={Receipt} label="Invoice Generation" />}
        {showHorseFeeds && <MenuItem to="/horse-feeds" icon={Wheat} label="Horse Feeds" />}
        {showFeedInventory && <MenuItem to="/feed-inventory" icon={Package} label="Feed Inventory" />}
        {showMedicineInventory && <MenuItem to="/medicine-inventory" icon={Pill} label="Medicine Inventory" />}
        {showGroceriesInventory && <MenuItem to="/groceries-inventory" icon={ShoppingCart} label="Groceries Inventory" />}
        {showExpenses && <MenuItem to="/expenses" icon={CreditCard} label="Expense Tracking" />}
        {showInspections && <MenuItem to="/inspections" icon={Search} label="Inspection Rounds" />}
        {showFines && <MenuItem to="/fines" icon={AlertTriangle} label="Fine System" />}
        <MenuItem to="/reports" icon={BarChart3} label="Reports" />
        <MenuItem to="/settings" icon={Settings} label="Settings" />
      </ul>
    </aside>
  );
};

export default Sidebar;
