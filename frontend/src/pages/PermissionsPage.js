import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  getPermissions, updatePermissions,
  getTaskPermissions, updateTaskPermissions, getRoleDefaults
} from '../services/permissionService';
import {
  Search, ChevronRight, Check, Users, LayoutDashboard, BarChart2,
  AlertTriangle, Package, Calendar, CreditCard, Save, Info, Shield,
  Home, Feather, Wind, Flag, GraduationCap, Hammer, Wrench,
  Briefcase, Folder, Wallet, Receipt, Utensils, ChefHat, Flame,
  ClipboardList, Leaf, Sparkles, Zap, RotateCcw, Lock, Unlock, Bell
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
  viewNotifications: false,
};

const PermissionsPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState('role'); // 'role' | 'task'
  
  // ── Shared state ──
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openRoles, setOpenRoles] = useState(new Set());

  // ── Role-based permission state (existing) ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMS });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [message, setMessage] = useState('');

  // ── Task-based permission state (new) ──
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [roleDefaults, setRoleDefaults] = useState({}); // { roleName: [perm1, perm2,...] }
  const [taskOverrides, setTaskOverrides] = useState({}); // { permKey: true/false }
  const [pendingOverrides, setPendingOverrides] = useState({}); // { permKey: true/false/null }
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskSavedFlash, setTaskSavedFlash] = useState(false);
  const [taskMessage, setTaskMessage] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);

  // Define permissions dynamically using t() function
  const getPermissionDefs = () => [
    { key: 'viewDashboard', label: t('View Dashboard'), desc: t('Access the main dashboard overview and summary panels.'), icon: LayoutDashboard },
    { key: 'manageEmployees', label: t('Manage Employees'), desc: t('Create, edit or remove employee records and role assignments.'), icon: Users },
    { key: 'viewReports', label: t('View Reports'), desc: t('Access system-generated reports, analytics, and performance data.'), icon: BarChart2 },
    { key: 'issueFines', label: t('Issue Fines'), desc: t('Raise and record fines against employee accounts.'), icon: AlertTriangle },
    { key: 'manageInventory', label: t('Manage Inventory'), desc: t('Add, edit, and update inventory items and stock levels.'), icon: Package },
    { key: 'manageSchedules', label: t('Manage Schedules'), desc: t('Create and modify shift schedules and duty rosters.'), icon: Calendar },
    { key: 'viewPayroll', label: t('View Payroll'), desc: t('Access salary records, payslips, and payroll summaries.'), icon: CreditCard },
    { key: 'viewNotifications', label: t('View Notifications'), desc: t('Receive and view in-app notifications such as alerts, reminders, and updates.'), icon: Bell },
  ];

  // ── Data fetching ──
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [permRes, roleRes] = await Promise.all([
        getPermissions(),
        getRoleDefaults(),
      ]);
      setEmployees(permRes.data?.data || []);
      setRoleDefaults(roleRes.data?.data?.rolePermissions || {});
    } catch (err) {
      console.error('Failed to load permissions', err);
      setMessage('Failed to load permissions data.');
    } finally {
      setLoading(false);
    }
  };

  // When an employee is selected on the Task tab, load their overrides
  const loadTaskPerms = useCallback(async (empId) => {
    setTaskLoading(true);
    setTaskMessage('');
    try {
      const res = await getTaskPermissions(empId);
      const data = res.data?.data;
      setTaskOverrides(data?.overrides || {});
      setPendingOverrides({});
    } catch (err) {
      console.error('Failed to load task permissions', err);
      setTaskMessage('Failed to load task permissions.');
    } finally {
      setTaskLoading(false);
    }
  }, []);

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

  // ── Role tab: multi-select employee ──
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

  // ── Task tab: single-select employee ──
  const selectEmployeeForTask = useCallback((emp) => {
    setSelectedEmployee(emp);
    setPendingOverrides({});
    loadTaskPerms(emp.id);
  }, [loadTaskPerms]);

  // Get the computed permission list for the selected employee
  const taskPermsList = useMemo(() => {
    if (!selectedEmployee) return [];
    const role = selectedEmployee.designation;
    const defaults = roleDefaults[role] || [];
    // Collect all unique permissions (defaults + any overrides that exist)
    const allPerms = new Set([...defaults, ...Object.keys(taskOverrides), ...Object.keys(pendingOverrides)]);
    const list = [];
    for (const perm of allPerms) {
      const roleDefault = defaults.includes(perm);
      // Check if there's a pending change, otherwise use saved override
      const hasPending = perm in pendingOverrides;
      const hasSavedOverride = perm in taskOverrides;
      let effectiveValue;
      let overrideState; // 'none' | 'granted' | 'denied' | 'pending-grant' | 'pending-deny' | 'pending-reset'
      
      if (hasPending) {
        if (pendingOverrides[perm] === null) {
          // Resetting to default
          effectiveValue = roleDefault;
          overrideState = 'pending-reset';
        } else {
          effectiveValue = pendingOverrides[perm];
          overrideState = effectiveValue ? 'pending-grant' : 'pending-deny';
        }
      } else if (hasSavedOverride) {
        effectiveValue = taskOverrides[perm];
        overrideState = effectiveValue ? 'granted' : 'denied';
      } else {
        effectiveValue = roleDefault;
        overrideState = 'none';
      }

      list.push({
        key: perm,
        label: formatPermName(perm),
        roleDefault,
        effectiveValue,
        overrideState,
        hasOverride: hasSavedOverride && !hasPending,
        hasPending,
      });
    }
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedEmployee, roleDefaults, taskOverrides, pendingOverrides]);

  const hasPendingChanges = Object.keys(pendingOverrides).length > 0;

  const toggleTaskPerm = useCallback((permKey, currentEffective, roleDefault, hasOverride) => {
    setPendingOverrides(prev => {
      const next = { ...prev };
      if (permKey in next) {
        // Already has a pending change — toggle again or cycle
        const pendingVal = next[permKey];
        if (pendingVal === null) {
          // Was resetting, now explicitly grant if default is deny, or deny if default is grant
          next[permKey] = !roleDefault;
        } else {
          // Was overriding, reset to role default
          delete next[permKey];
        }
      } else {
        // No pending change yet
        if (hasOverride) {
          // Has saved override → set pending to reset (null)
          next[permKey] = null;
        } else {
          // No override → flip from role default
          next[permKey] = !roleDefault;
        }
      }
      return next;
    });
  }, []);

  const resetTaskPerm = useCallback((permKey) => {
    setPendingOverrides(prev => {
      const next = { ...prev };
      // Mark as "reset to default" → send null to API
      next[permKey] = null;
      return next;
    });
  }, []);

  const handleTaskSave = async () => {
    if (!selectedEmployee || !hasPendingChanges) return;
    setTaskSaving(true);
    setTaskMessage('');
    try {
      await updateTaskPermissions(selectedEmployee.id, pendingOverrides);
      setTaskSavedFlash(true);
      setTimeout(() => setTaskSavedFlash(false), 2000);
      // Reload
      await loadTaskPerms(selectedEmployee.id);
    } catch (err) {
      console.error('Failed to save task permissions', err);
      setTaskMessage(t('Failed to save task permissions.'));
    } finally {
      setTaskSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isAdmin = ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="perm-loading">
        <p>{t('Loading permissions…')}</p>
      </div>
    );
  }

  // ── Sidebar renderer (shared by both tabs) ──
  const renderSidebar = () => (
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
                    const sel = activeTab === 'role'
                      ? selectedIds.has(emp.id)
                      : selectedEmployee?.id === emp.id;
                    return (
                      <div
                        key={emp.id}
                        className={`perm-emp-item ${sel ? 'selected' : ''}`}
                        onClick={() => {
                          if (activeTab === 'role') {
                            toggleEmployee(emp.id);
                          } else {
                            selectEmployeeForTask(emp);
                          }
                        }}
                      >
                        {activeTab === 'role' ? (
                          <div className={`perm-emp-check ${sel ? 'checked' : ''}`}>
                            {sel && <Check size={10} />}
                          </div>
                        ) : (
                          <div className={`perm-emp-radio ${sel ? 'active' : ''}`} />
                        )}
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
  );

  return (
    <div className="perm-wrapper">
      {renderSidebar()}

      {/* ── MAIN ── */}
      <div className="perm-main">
        <div className="perm-main-header">
          <div>
            <h1>{t('Permissions')}</h1>
            <p className="perm-subtitle">
              {activeTab === 'role'
                ? t('Select employees and configure their access rights by role')
                : t('Select an employee and override specific task permissions')}
            </p>
          </div>
          <div className="perm-tabs">
            <button
              className={`perm-tab ${activeTab === 'role' ? 'active' : ''}`}
              onClick={() => setActiveTab('role')}
            >
              <Shield size={14} />
              {t('Role Permissions')}
            </button>
            <button
              className={`perm-tab ${activeTab === 'task' ? 'active' : ''}`}
              onClick={() => setActiveTab('task')}
            >
              <Lock size={14} />
              {t('Task Permissions')}
            </button>
          </div>
        </div>

        {/* ══ ROLE TAB (existing) ══ */}
        {activeTab === 'role' && (
          <>
            <div className="perm-cards-area">
              {selectedIds.size > 0 && (
                <div className="perm-selection-badge" style={{ marginBottom: 16 }}>
                  <Users size={13} />
                  <span>{selectedIds.size} {selectedIds.size === 1 ? t('employee') : t('employees')} {t('selected')}</span>
                </div>
              )}
              <div className="label-overline">{t('Access Control')}</div>

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
                {savedFlash ? t('Permissions Saved!') : saving ? t('Saving…') : t('Save Permissions')}
              </button>
            </div>
          </>
        )}

        {/* ══ TASK TAB (new — per-employee overrides) ══ */}
        {activeTab === 'task' && (
          <>
            <div className="perm-cards-area">
              {!selectedEmployee ? (
                <div className="perm-task-empty">
                  <Users size={40} strokeWidth={1} />
                  <h3>{t('Select an Employee')}</h3>
                  <p>{t('Choose an employee from the sidebar to view and override their task permissions.')}</p>
                </div>
              ) : taskLoading ? (
                <div className="perm-loading" style={{ height: 'auto', padding: '40px 0' }}>
                  <p>{t('Loading task permissions…')}</p>
                </div>
              ) : (
                <>
                  <div className="perm-task-header-info">
                    <div className={`perm-emp-avatar active`} style={{ width: 36, height: 36, fontSize: 13 }}>
                      {getInitials(selectedEmployee.fullName)}
                    </div>
                    <div>
                      <div className="perm-task-emp-name">{selectedEmployee.fullName}</div>
                      <div className="perm-task-emp-role">{selectedEmployee.designation} &middot; {selectedEmployee.department}</div>
                    </div>
                  </div>

                  <div className="perm-task-legend">
                    <span className="perm-legend-item"><span className="perm-dot perm-dot-default" /> {t('Role Default')}</span>
                    <span className="perm-legend-item"><span className="perm-dot perm-dot-granted" /> {t('Override: Granted')}</span>
                    <span className="perm-legend-item"><span className="perm-dot perm-dot-denied" /> {t('Override: Denied')}</span>
                    <span className="perm-legend-item"><span className="perm-dot perm-dot-pending" /> {t('Unsaved Change')}</span>
                  </div>

                  <div className="label-overline" style={{ marginBottom: 12 }}>
                    {t('Task Permissions')} ({taskPermsList.length})
                  </div>

                  {taskPermsList.map(perm => {
                    const isPending = perm.hasPending;
                    const isOverride = perm.hasOverride;

                    let statusClass = '';
                    let statusLabel = '';
                    if (isPending) {
                      statusClass = 'pending';
                      statusLabel = perm.overrideState === 'pending-reset' ? t('Resetting') : (perm.effectiveValue ? t('Granting') : t('Denying'));
                    } else if (isOverride) {
                      statusClass = perm.effectiveValue ? 'granted' : 'denied-override';
                      statusLabel = perm.effectiveValue ? t('Override: Granted') : t('Override: Denied');
                    } else {
                      statusClass = perm.roleDefault ? 'default-on' : 'default-off';
                      statusLabel = perm.roleDefault ? t('Role Default: On') : t('Role Default: Off');
                    }

                    return (
                      <div key={perm.key} className={`perm-task-card ${statusClass}`}>
                        <div className="perm-task-card-main">
                          <div className={`perm-task-indicator ${statusClass}`} />
                          <div className="perm-card-info">
                            <div className="perm-card-name">{perm.label}</div>
                            <div className="perm-card-desc perm-task-status">{statusLabel}</div>
                          </div>
                          <div className="perm-task-actions">
                            {(isOverride || isPending) && (
                              <button
                                className="perm-task-reset-btn"
                                title={t('Reset to role default')}
                                onClick={(e) => { e.stopPropagation(); resetTaskPerm(perm.key); }}
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                            <div className="perm-toggle-wrap">
                              <span className={`perm-toggle-label ${perm.effectiveValue ? 'on' : ''}`}>
                                {perm.effectiveValue ? <Unlock size={13} /> : <Lock size={13} />}
                              </span>
                              <label className="perm-toggle">
                                <input
                                  type="checkbox"
                                  checked={perm.effectiveValue}
                                  onChange={() => toggleTaskPerm(perm.key, perm.effectiveValue, perm.roleDefault, perm.hasOverride)}
                                />
                                <span className={`perm-toggle-slider ${perm.effectiveValue ? 'on' : ''}`}>
                                  <span className={`perm-toggle-dot ${perm.effectiveValue ? 'on' : ''}`} />
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {taskPermsList.length === 0 && (
                    <div className="perm-empty">{t('No task permissions defined for this role.')}</div>
                  )}
                </>
              )}
            </div>

            <div className="perm-footer">
              <div className="perm-footer-hint">
                <Info size={13} />
                <span>
                  {selectedEmployee
                    ? hasPendingChanges
                      ? `${Object.keys(pendingOverrides).length} ${t('unsaved changes for')} ${selectedEmployee.fullName}`
                      : `${t('Viewing permissions for')} ${selectedEmployee.fullName}`
                    : t('Select an employee to manage task permissions')}
                </span>
              </div>
              {taskMessage && <span className="perm-footer-msg">{taskMessage}</span>}
              <button
                className={`btn-save ${taskSavedFlash ? 'perm-saved-flash' : ''}`}
                onClick={handleTaskSave}
                disabled={taskSaving || !selectedEmployee || !hasPendingChanges}
              >
                {taskSavedFlash ? <Check size={14} /> : <Save size={14} />}
                {taskSavedFlash ? t('Saved!') : taskSaving ? t('Saving…') : t('Save Overrides')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper: convert snake_case permission key to readable label
function formatPermName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default PermissionsPage;
