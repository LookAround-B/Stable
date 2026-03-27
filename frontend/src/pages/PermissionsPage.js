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
  Settings2, Download, Filter, SlidersHorizontal, Lock, CheckCircle, Plus, RotateCcw, Unlock,
  Home, Feather, Wind, Flag, GraduationCap, Hammer, Wrench,
  Briefcase, Folder, Wallet, Receipt, Utensils, ChefHat, Flame,
  ClipboardList, Leaf, Sparkles, Zap, Bell
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

// Helper: convert snake_case permission key to readable label
function formatPermName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

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

  // ── Role-based permission state ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMS });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [message, setMessage] = useState('');

  // ── Task-based permission state ──
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

  const selectEmployeeForTask = useCallback((emp) => {
    setSelectedEmployee(emp);
    setPendingOverrides({});
    loadTaskPerms(emp.id);
  }, [loadTaskPerms]);

  const taskPermsList = useMemo(() => {
    if (!selectedEmployee) return [];
    const role = selectedEmployee.designation;
    const defaults = roleDefaults[role] || [];
    const allPerms = new Set([...defaults, ...Object.keys(taskOverrides), ...Object.keys(pendingOverrides)]);
    const list = [];
    for (const perm of allPerms) {
      const roleDefault = defaults.includes(perm);
      const hasPending = perm in pendingOverrides;
      const hasSavedOverride = perm in taskOverrides;
      let effectiveValue;
      let overrideState;
      
      if (hasPending) {
        if (pendingOverrides[perm] === null) {
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
        const pendingVal = next[permKey];
        if (pendingVal === null) {
          next[permKey] = !roleDefault;
        } else {
          delete next[permKey];
        }
      } else {
        if (hasOverride) {
          next[permKey] = null;
        } else {
          next[permKey] = !roleDefault;
        }
      }
      return next;
    });
  }, []);

  const resetTaskPerm = useCallback((permKey) => {
    setPendingOverrides(prev => {
      const next = { ...prev };
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="label-sm text-muted-foreground text-[10px] truncate uppercase">ORGANIZATION &gt; SYSTEM SETTINGS &gt; <span className="text-primary">PERMISSIONS MATRIX</span></p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">System <span className="text-primary">Permissions</span></h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">Configure global access matrices and individual task overrides. Changes are logged in real-time.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <div className="flex gap-1 bg-surface-container-high p-1 rounded-lg">
            <button
              className={`px-4 h-9 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'role' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('role')}
            >
              <Shield size={14} /> {t('Role Defaults')}
            </button>
            <button
              className={`px-4 h-9 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'task' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('task')}
            >
              <Lock size={14} /> {t('User Overrides')}
            </button>
          </div>
          {activeTab === 'role' ? (
            <button
              onClick={handleSave}
              disabled={saving || selectedIds.size === 0}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all justify-center"
            >
              {savedFlash ? <Check size={14} /> : saving ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save size={14} />}
              {savedFlash ? t('SAVED') : saving ? t('SAVING...') : t('SAVE CHANGES')}
            </button>
          ) : (
            <button
              onClick={handleTaskSave}
              disabled={taskSaving || !selectedEmployee || !hasPendingChanges}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all justify-center"
            >
              {taskSavedFlash ? <Check size={14} /> : taskSaving ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save size={14} />}
              {taskSavedFlash ? t('SAVED') : taskSaving ? t('SAVING...') : t('SAVE CHANGES')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Personnel Directory Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-surface-container-highest rounded-lg p-4 edge-glow">
            <div className="flex items-center justify-between mb-3">
              <p className="label-sm text-primary tracking-widest">{t('PERSONNEL DIRECTORY')}</p>
              <div className="flex gap-1">
                <button className="p-1 text-muted-foreground hover:text-foreground"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
                <button className="p-1 text-muted-foreground hover:text-foreground"><Filter className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('Search staff...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              {filteredGroups.map(([role, emps]) => {
                const isOpen = openRoles.has(role);
                return (
                  <div key={role} className="mb-2">
                    <div 
                      className="flex items-center justify-between px-2 py-1.5 hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors"
                      onClick={() => toggleRole(role)}
                    >
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{role}</span>
                      <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                    {isOpen && (
                      <div className="mt-1 space-y-1 pl-2">
                        {emps.map(emp => {
                          const sel = activeTab === 'role'
                            ? selectedIds.has(emp.id)
                            : selectedEmployee?.id === emp.id;
                          return (
                            <button
                              key={emp.id}
                              onClick={() => {
                                if (activeTab === 'role') toggleEmployee(emp.id);
                                else selectEmployeeForTask(emp);
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors border-l-2 ${sel ? 'bg-surface-container-high border-primary' : 'border-transparent hover:bg-surface-container-high/50'}`}
                            >
                              {activeTab === 'role' ? (
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                                  {sel && <Check size={10} />}
                                </div>
                              ) : null}
                              {activeTab === 'task' ? (
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                                  {getInitials(emp.fullName)}
                                </div>
                              ) : null}
                              <div className="min-w-0">
                                <p className={`text-sm truncate font-medium ${sel && activeTab==='task' ? 'text-foreground' : 'text-muted-foreground'}`}>{emp.fullName}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredGroups.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">{t('No employees found')}.</div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-highest rounded-lg p-4 edge-glow">
            <p className="label-sm text-muted-foreground mb-3">{t('STATUS LEGEND')}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-primary" /> <span className="text-foreground">ROLE DEFAULT (INHERITED)</span></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-destructive" /> <span className="text-foreground">MANUAL OVERRIDE (DENIED)</span></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-success" /> <span className="text-foreground">MANUAL OVERRIDE (GRANTED)</span></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-warning" /> <span className="text-foreground">UNSAVED PENDING CHANGE</span></div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {activeTab === 'role' && (
            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0"><Shield className="w-4 h-4 text-primary" /></div>
                   <h3 className="heading-md text-foreground uppercase tracking-wider text-sm">{t('Role Permissions Matrix')}</h3>
                </div>
                {selectedIds.size > 0 && (
                  <span className="px-3 py-1.5 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider">
                     {selectedIds.size} {selectedIds.size === 1 ? 'EMPLOYEE' : 'EMPLOYEES'} SELECTED
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getPermissionDefs().map(perm => {
                  const isOn = permissions[perm.key];
                  const PermIcon = perm.icon;
                  return (
                    <div 
                      key={perm.key} 
                      onClick={() => togglePerm(perm.key)}
                      className={`rounded-lg p-4 border cursor-pointer transition-all flex flex-col h-full ${isOn ? 'border-primary bg-surface-container-high/80' : 'border-border/50 bg-surface-container/50 opacity-60'}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center transition-colors ${isOn ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <PermIcon size={16} />
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${isOn ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {isOn ? 'GRANTED' : 'DENIED'}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-sm mb-1">{perm.label}</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-grow">{perm.desc}</p>
                      
                      <div className="flex items-center justify-between border-t border-border/50 pt-3">
                         <span className={`text-[10px] font-bold tracking-wider ${isOn ? 'text-primary' : 'text-muted-foreground'}`}>
                           {isOn ? 'ACTIVE' : 'DISABLED'}
                         </span>
                         <div className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${isOn ? 'bg-primary' : 'bg-surface-container-high border border-border'}`}>
                           <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
               {message && <div className="mt-4 p-3 bg-destructive/15 text-destructive rounded-lg text-sm border border-destructive/30">{message}</div>}
            </div>
          )}

          {activeTab === 'task' && (
            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow min-h-[500px]">
              {!selectedEmployee ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
                  <Lock className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">{t('Select an Employee')}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">{t('Choose an employee from the directory sidebar to view and override their specific task access permissions.')}</p>
                </div>
              ) : taskLoading ? (
                <div className="flex justify-center items-center h-48">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                         {getInitials(selectedEmployee.fullName)}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">{selectedEmployee.fullName}</h3>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{selectedEmployee.designation}</p>
                      </div>
                    </div>
                    {hasPendingChanges && (
                      <span className="px-3 py-1.5 rounded bg-warning/20 text-warning text-[10px] font-bold uppercase tracking-wider animate-pulse">
                         UNSAVED OVERRIDES
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {taskPermsList.map(perm => {
                      const isPending = perm.hasPending;
                      const isOverride = perm.hasOverride;

                      let borderColor = 'border-border/50';
                      let bgColor = 'bg-surface-container/50 opacity-60';
                      let badgeColor = 'bg-muted text-muted-foreground';
                      let badgeText = 'DISABLED';
                      
                      if (isPending) {
                          borderColor = 'border-warning shadow-[0_0_10px_rgba(234,179,8,0.2)]';
                          bgColor = 'bg-warning/5 opacity-100';
                          badgeColor = 'bg-warning text-warning-foreground';
                          badgeText = 'PENDING';
                      } else if (isOverride) {
                          borderColor = perm.effectiveValue ? 'border-success' : 'border-destructive';
                          bgColor = perm.effectiveValue ? 'bg-success/5 opacity-100' : 'bg-destructive/5 opacity-100';
                          badgeColor = perm.effectiveValue ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive';
                          badgeText = perm.effectiveValue ? 'GRANTED OVERRIDE' : 'DENIED OVERRIDE';
                      } else {
                          if (perm.roleDefault) {
                              borderColor = 'border-primary';
                              bgColor = 'bg-surface-container-high/80 opacity-100';
                              badgeColor = 'bg-primary/20 text-primary';
                              badgeText = 'ROLE DEFAULT';
                          }
                      }

                      return (
                        <div key={perm.key} className={`rounded-lg p-4 border transition-all flex flex-col h-full ${borderColor} ${bgColor}`}>
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-bold text-foreground text-sm flex-1 mr-2 leading-tight">{perm.label}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider shrink-0 ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-auto">
                            {(isOverride || isPending) ? (
                              <button
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                onClick={(e) => { e.stopPropagation(); resetTaskPerm(perm.key); }}
                              >
                                <RotateCcw size={12} /> {t('RESET')}
                              </button>
                            ) : <span className="text-[10px] text-muted-foreground">INHERITED</span>}
                            
                            <div className="flex items-center gap-2">
                               <span className={`text-[10px] font-bold tracking-wider ${perm.effectiveValue ? 'text-primary' : 'text-muted-foreground'}`}>{perm.effectiveValue ? 'ACTIVE' : 'OFF'}</span>
                               <div 
                                 onClick={() => toggleTaskPerm(perm.key, perm.effectiveValue, perm.roleDefault, perm.hasOverride)}
                                 className={`w-9 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${perm.effectiveValue ? 'bg-primary' : 'bg-surface-container-high border border-border'}`}
                               >
                                 <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${perm.effectiveValue ? 'translate-x-4' : 'translate-x-0'}`} />
                               </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {taskMessage && <div className="mt-4 p-3 bg-destructive/15 text-destructive rounded-lg text-sm border border-destructive/30">{taskMessage}</div>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionsPage;
