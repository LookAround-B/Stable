import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { getPermissions, updatePermissions } from '../services/permissionService';
import {
  Search, ChevronRight, Check, Users, LayoutDashboard, BarChart2,
  AlertTriangle, Package, Calendar, CreditCard, Save, Info, Shield,
  Home, Feather, Wind, Flag, GraduationCap, Hammer, Wrench,
  Briefcase, Folder, Wallet, Receipt, Utensils, ChefHat, Flame,
  ClipboardList, Leaf, Sparkles, Zap
} from 'lucide-react';

const ROLE_ICONS = {
  'Ground Supervisor': LayoutDashboard,
  'Guard': Shield,
  'Gardener': Leaf,
  'Housekeeping': Sparkles,
  'Electrician': Zap,
  'Stable Manager': Home,
  'Groom': Feather,
  'Riding Boy': Wind,
  'Rider': Flag,
  'Instructor': GraduationCap,
  'Farrier': Hammer,
  'Jamedar': Wrench,
  'Executive Admin': Briefcase,
  'Senior Executive Admin': Briefcase,
  'Junior Admin': Folder,
  'Executive Accounts': Wallet,
  'Senior Executive Accounts': Wallet,
  'Junior Accounts': Receipt,
  'Restaurant Manager': Utensils,
  'Chef': ChefHat,
  'Kitchen Helper': Flame,
  'Waiter': ClipboardList,
  'Director': Briefcase,
  'School Administrator': Briefcase,
  'Super Admin': Shield,
};

const DEFAULT_PERMS = {
  viewDashboard: false,
  manageEmployees: false,
  viewReports: false,
  issueFines: false,
  manageInventory: false,
  manageSchedules: false,
  viewPayroll: false,
};

const PermissionsPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  
  // Define permissions dynamically using t() function
  const getPermissionDefs = () => [
    { key: 'viewDashboard', label: t('View Dashboard'), desc: t('Access the main dashboard overview and summary panels.'), icon: LayoutDashboard },
    { key: 'manageEmployees', label: t('Manage Employees'), desc: t('Create, edit or remove employee records and role assignments.'), icon: Users },
    { key: 'viewReports', label: t('View Reports'), desc: t('Access system-generated reports, analytics, and performance data.'), icon: BarChart2 },
    { key: 'issueFines', label: t('Issue Fines'), desc: t('Raise and record fines against employee accounts.'), icon: AlertTriangle },
    { key: 'manageInventory', label: t('Manage Inventory'), desc: t('Add, edit, and update inventory items and stock levels.'), icon: Package },
    { key: 'manageSchedules', label: t('Manage Schedules'), desc: t('Create and modify shift schedules and duty rosters.'), icon: Calendar },
    { key: 'viewPayroll', label: t('View Payroll'), desc: t('Access salary records, payslips, and payroll summaries.'), icon: CreditCard },
  ];
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openRoles, setOpenRoles] = useState(new Set());
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMS });
  const [message, setMessage] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPermissions();
      setEmployees(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load permissions', err);
      setMessage('Failed to load permissions data.');
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      const role = emp.designation || 'Unknown';
      if (!map[role]) map[role] = [];
      map[role].push(emp);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [employees]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return grouped;
    return grouped
      .map(([role, emps]) => [role, emps.filter(e => e.fullName.toLowerCase().includes(q) || role.toLowerCase().includes(q))])
      .filter(([_, emps]) => emps.length > 0);
  }, [grouped, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setOpenRoles(new Set(filteredGroups.map(([role]) => role)));
    }
  }, [searchQuery, filteredGroups]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      setPermissions({ ...DEFAULT_PERMS });
      return;
    }
    if (selectedIds.size === 1) {
      const emp = employees.find(e => selectedIds.has(e.id));
      if (emp?.permissions) {
        setPermissions({ ...DEFAULT_PERMS, ...emp.permissions });
      } else {
        setPermissions({ ...DEFAULT_PERMS });
      }
    }
  }, [selectedIds, employees]);

  const toggleRole = useCallback((role) => {
    setOpenRoles(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  }, []);

  const toggleEmployee = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const togglePerm = useCallback((key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      setMessage(t('Please select at least one employee.'));
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await updatePermissions([...selectedIds], permissions);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      await fetchData();
    } catch (err) {
      console.error('Failed to save permissions', err);
      setMessage(t('Failed to save permissions.'));
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isAdmin = ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  if (!isAdmin) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="perm-loading">
        <p>{t('Loading permissions…')}</p>
      </div>
    );
  }

  return (
    <div className="perm-wrapper">
      {/* ── SIDEBAR ── */}
      <div className="perm-sidebar">
        <div className="perm-sidebar-header">
          <div className="label-overline">{t('Staff Directory')}</div>
          <div className="perm-search-wrap">
            <Search size={14} className="perm-search-icon" />
            <input
              type="text"
              className="perm-search-input"
              placeholder={t('Search employees…')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="perm-employee-list">
          {filteredGroups.map(([role, emps]) => {
            const isOpen = openRoles.has(role);
            const RoleIcon = ROLE_ICONS[role] || Users;
            return (
              <div key={role} className="perm-role-group">
                <div className="perm-role-header" onClick={() => toggleRole(role)}>
                  <span className="perm-role-icon-wrap">
                    <RoleIcon size={14} />
                  </span>
                  <span className="perm-role-name">{role}</span>
                  <span className="perm-role-count">{emps.length}</span>
                  <ChevronRight
                    size={14}
                    className={`perm-role-chevron ${isOpen ? 'open' : ''}`}
                  />
                </div>
                {isOpen && (
                  <div className="perm-role-employees">
                    {emps.map(emp => {
                      const sel = selectedIds.has(emp.id);
                      return (
                        <div
                          key={emp.id}
                          className={`perm-emp-item ${sel ? 'selected' : ''}`}
                          onClick={() => toggleEmployee(emp.id)}
                        >
                          <div className={`perm-emp-check ${sel ? 'checked' : ''}`}>
                            {sel && <Check size={10} />}
                          </div>
                          <div className={`perm-emp-avatar ${sel ? 'active' : ''}`}>
                            {getInitials(emp.fullName)}
                          </div>
                          <span className="perm-emp-name">{emp.fullName}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {filteredGroups.length === 0 && (
            <div className="perm-empty">{t('No employees found')}.</div>
          )}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="perm-main">
        <div className="perm-main-header">
          <div>
            <h1>{t('Permissions')}</h1>
            <p className="perm-subtitle">{t('Select employees and configure their access rights by role')}</p>
          </div>
          {selectedIds.size > 0 && (
            <div className="perm-selection-badge">
              <Users size={13} />
              <span>{selectedIds.size} {selectedIds.size === 1 ? t('employee') : t('employees')} {t('selected')}</span>
            </div>
          )}
        </div>

        <div className="perm-cards-area">
          <div className="label-overline">Access Control</div>

          {getPermissionDefs().map(perm => {
            const isOn = permissions[perm.key];
            const PermIcon = perm.icon;
            return (
              <div key={perm.key} className={`perm-card ${isOn ? 'on' : ''}`}>
                <div className={`perm-card-icon ${isOn ? 'on' : ''}`}>
                  <PermIcon size={18} />
                </div>
                <div className="perm-card-info">
                  <div className="perm-card-name">{perm.label}</div>
                  <div className="perm-card-desc">{perm.desc}</div>
                </div>
                <div className="perm-toggle-wrap">
                  <span className={`perm-toggle-label ${isOn ? 'on' : ''}`}>
                    {isOn ? 'ON' : 'OFF'}
                  </span>
                  <label className="perm-toggle">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => togglePerm(perm.key)}
                    />
                    <span className={`perm-toggle-slider ${isOn ? 'on' : ''}`}>
                      <span className={`perm-toggle-dot ${isOn ? 'on' : ''}`} />
                    </span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="perm-footer">
          <div className="perm-footer-hint">
            <Info size={13} />
            <span>{t('Changes will apply to all')} {selectedIds.size > 0 ? `${selectedIds.size} ${selectedIds.size === 1 ? t('selected') : t('selected')} ${selectedIds.size === 1 ? t('employee') : t('employees')}` : t('selected employees')}</span>
          </div>
          {message && <span className="perm-footer-msg">{message}</span>}
          <button
            className={`btn-save ${savedFlash ? 'perm-saved-flash' : ''}`}
            onClick={handleSave}
            disabled={saving || selectedIds.size === 0}
          >
            {savedFlash ? <Check size={14} /> : <Save size={14} />}
            {savedFlash ? 'Permissions Saved!' : saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsPage;
