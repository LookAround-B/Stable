import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  ChevronDown,
  Cog,
  DollarSign,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings2,
  Shield,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { logout } from '../services/authService';

const GROUPS = [
  {
    label: 'Organisation',
    icon: Settings2,
    items: [
      { to: '/horses', label: 'Horses', permission: 'viewHorses' },
      { to: '/employees', label: 'Team', permission: 'manageEmployees' },
    ],
  },
  {
    label: 'Tasks & Approvals',
    icon: CheckSquare,
    items: [
      { to: '/tasks', label: 'Tasks', permission: 'manageTasks' },
      { to: '/my-assigned-tasks', label: 'My Assigned Tasks', always: true },
      { to: '/pending-approvals', label: 'Approvals', permission: 'viewApprovals' },
      { to: '/meetings', label: 'Meetings', permission: 'viewMeetings' },
    ],
  },
  {
    label: 'Stable Operations',
    icon: Stethoscope,
    items: [
      { to: '/medicine-logs', label: 'Medicine Logs', permission: 'viewMedicineLogs' },
      { to: '/horse-care-team', label: 'Care Teams', always: false },
      { to: '/medicine-inventory', label: 'Medicine Inventory', permission: 'viewMedicineInventory' },
      { to: '/horse-feeds', label: 'Horse Feeds', permission: 'viewHorseFeeds' },
      { to: '/feed-inventory', label: 'Feed Inventory', permission: 'viewFeedInventory' },
      { to: '/farrier-shoeing', label: 'Farrier Shoeing', permission: 'viewFarrierShoeing' },
      { to: '/tack-inventory', label: 'Tack Inventory', permission: 'viewTackInventory' },
      { to: '/farrier-inventory', label: 'Farrier Inventory', permission: 'viewFarrierInventory' },
    ],
  },
  {
    label: 'Ground Operations',
    icon: Cog,
    items: [
      { to: '/gate-entry', label: 'Gate Register', permission: 'viewGateEntry' },
      { to: '/gate-attendance', label: 'Gate Attendance', permission: 'viewGateEntry' },
      { to: '/daily-attendance', label: 'Daily Register', permission: 'viewDailyAttendance' },
      { to: '/team-attendance', label: 'Mark Attendance', permission: 'viewTeamAttendance' },
      { to: '/digital-attendance', label: 'Digital Attendance', permission: 'viewDailyAttendance' },
      { to: '/groom-worksheet', label: 'Groom Worksheet', permission: 'viewGroomWorksheet' },
      { to: '/work-records', label: 'Work Record', permission: 'viewGroomWorksheet' },
      { to: '/daily-work-records', label: 'Daily Work Records', permission: 'viewEIRS' },
      { to: '/inspections', label: 'Inspection Rounds', permission: 'viewInspections' },
      { to: '/housekeeping-inventory', label: 'Housekeeping Inventory', permission: 'viewHousekeepingInventory' },
    ],
  },
  {
    label: 'Restaurant',
    icon: UtensilsCrossed,
    items: [
      { to: '/groceries-inventory', label: 'Groceries Inventory', permission: 'viewGroceriesInventory' },
    ],
  },
  {
    label: 'Accounts & Finance',
    icon: DollarSign,
    items: [
      { to: '/invoice-generation', label: 'Invoice Generation', permission: 'viewInvoiceGeneration' },
      { to: '/expenses', label: 'Expense Tracking', permission: 'viewExpenses' },
      { to: '/fines', label: 'Fine System', permission: 'viewFines' },
    ],
  },
  {
    label: 'System',
    icon: Shield,
    items: [
      { to: '/reports', label: 'Reports', permission: 'viewReports' },
      { to: '/permissions', label: 'Permissions', permission: 'viewPermissions' },
      { to: '/entity-map', label: 'Entity Map', permission: 'viewDashboard' },
      { to: '/profile', label: 'Profile', always: true },
    ],
  },
];

function Sidebar({ mobileOpen, onCloseMobile, collapsed, onToggleCollapse }) {
  const { t } = useI18n();
  const permissions = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = window.localStorage.getItem('efm.sidebar.openGroups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [flyout, setFlyout] = useState(null);
  const flyoutTimer = useRef(null);
  const groupButtonRefs = useRef({});

  const isActive = useCallback(
    (path) => {
      if (path === '/') {
        return location.pathname === '/';
      }
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  const visibleGroups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.show === false) return false;
          if (item.always) return true;
          if (item.permission) return Boolean(permissions[item.permission]);
          return true;
        }),
      })).filter((group) => group.items.length > 0),
    [permissions]
  );

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      visibleGroups.forEach((group) => {
        if (typeof next[group.label] !== 'boolean') {
          next[group.label] = false;
        }
      });
      Object.keys(next).forEach((label) => {
        if (!visibleGroups.some((group) => group.label === label)) {
          delete next[label];
        }
      });
      return next;
    });
  }, [visibleGroups]);

  useEffect(() => {
    window.localStorage.setItem('efm.sidebar.openGroups', JSON.stringify(openGroups));
  }, [openGroups]);

  useEffect(() => {
    if (!collapsed) {
      setFlyout(null);
    }
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = useCallback(() => {
    if (window.innerWidth <= 1024) {
      onCloseMobile();
    }
    setFlyout(null);
  }, [onCloseMobile]);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const openFlyout = useCallback((label) => {
    if (!collapsed) return;
    if (flyoutTimer.current) {
      window.clearTimeout(flyoutTimer.current);
    }
    const button = groupButtonRefs.current[label];
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setFlyout({ label, top: rect.top });
  }, [collapsed]);

  const scheduleFlyoutClose = useCallback(() => {
    if (flyoutTimer.current) {
      window.clearTimeout(flyoutTimer.current);
    }
    flyoutTimer.current = window.setTimeout(() => setFlyout(null), 120);
  }, []);

  const cancelFlyoutClose = useCallback(() => {
    if (flyoutTimer.current) {
      window.clearTimeout(flyoutTimer.current);
    }
  }, []);

  const isDashboardActive = location.pathname === '/' || location.pathname === '/dashboard';
  const isAnalysisActive = location.pathname === '/analysis';

  return (
    <>
      <aside className={`lovable-sidebar horse-pattern ${mobileOpen ? 'lovable-sidebar-open' : ''} ${collapsed ? 'lovable-sidebar-collapsed' : ''}`}>
        <div className={`lovable-sidebar-brand ${collapsed ? 'collapsed' : ''}`}>
          <div className="lovable-sidebar-logo-copy">
            <span className="lovable-sidebar-logo">EFM</span>
            {!collapsed && <span className="lovable-sidebar-subtitle">{t('Equine Facility Management')}</span>}
          </div>
        </div>

        <div className="lovable-sidebar-toggle-row">
          <button
            className="lovable-sidebar-toggle"
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? t('Expand sidebar') : t('Collapse sidebar')}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div className="lovable-sidebar-scroll">
          <div className="lovable-sidebar-dashboard">
            <Link
              to="/dashboard"
              className={`lovable-nav-link lovable-nav-link-root ${isDashboardActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
              onClick={handleNavClick}
              title={collapsed ? t('Dashboard') : undefined}
            >
              {isDashboardActive && <span className="lovable-active-rail" />}
              <div className="lovable-group-copy">
                <LayoutDashboard size={16} />
                {!collapsed && <span>{t('Dashboard')}</span>}
              </div>
            </Link>
          </div>

          <div className="lovable-sidebar-dashboard">
            <Link
              to="/analysis"
              className={`lovable-nav-link lovable-nav-link-root ${isAnalysisActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
              onClick={handleNavClick}
              title={collapsed ? t('Analysis') : undefined}
            >
              {isAnalysisActive && <span className="lovable-active-rail" />}
              <div className="lovable-group-copy">
                <BarChart3 size={16} />
                {!collapsed && <span>{t('Analysis')}</span>}
              </div>
            </Link>
          </div>

          <nav className="lovable-sidebar-nav">
            {visibleGroups.map((group) => {
              const groupIsActive = group.items.some((item) => isActive(item.to));
              const isOpen = Boolean(openGroups[group.label]) && !collapsed;
              const GroupIcon = group.icon;

              return (
                <div key={group.label} className="lovable-nav-group">
                  <button
                    ref={(element) => {
                      groupButtonRefs.current[group.label] = element;
                    }}
                    className={`lovable-group-trigger ${groupIsActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                    type="button"
                    onClick={() => {
                      if (collapsed) {
                        if (flyout?.label === group.label) {
                          setFlyout(null);
                        } else {
                          openFlyout(group.label);
                        }
                        return;
                      }
                      toggleGroup(group.label);
                    }}
                    onMouseEnter={() => openFlyout(group.label)}
                    onMouseLeave={scheduleFlyoutClose}
                    title={collapsed ? t(group.label) : undefined}
                  >
                    <div className="lovable-group-copy">
                      <GroupIcon size={16} />
                      {!collapsed && <span>{t(group.label)}</span>}
                    </div>
                    {!collapsed && <ChevronDown size={14} className={`lovable-group-chevron ${isOpen ? 'open' : ''}`} />}
                  </button>

                  {isOpen && (
                    <div className="lovable-group-links">
                      {group.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`lovable-subnav-link ${isActive(item.to) ? 'active' : ''}`}
                          onClick={handleNavClick}
                        >
                          <span>{t(item.label)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="lovable-sidebar-footer">
          <button className="lovable-sidebar-logout" onClick={handleLogout} type="button" title={collapsed ? t('Logout') : undefined}>
            <LogOut size={16} />
            {!collapsed && <span>{t('Logout')}</span>}
          </button>

          <div className="lovable-sidebar-powered">
            {!collapsed && (
              <>
                <span>{t('Powered by')}</span>
                <strong>LookAround</strong>
              </>
            )}
          </div>
        </div>
      </aside>

      {collapsed && flyout && (() => {
        const group = visibleGroups.find((entry) => entry.label === flyout.label);
        if (!group) return null;
        const FlyoutIcon = group.icon;
        return (
          <div
            className="lovable-sidebar-flyout"
            style={{ top: flyout.top, left: 76 }}
            onMouseEnter={cancelFlyoutClose}
            onMouseLeave={scheduleFlyoutClose}
          >
            <div className="lovable-sidebar-flyout-head">
              <FlyoutIcon size={14} />
              <span>{t(group.label)}</span>
            </div>
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`lovable-sidebar-flyout-link ${isActive(item.to) ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                {t(item.label)}
              </Link>
            ))}
          </div>
        );
      })()}
    </>
  );
}

export default Sidebar;
