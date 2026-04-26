import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import {
  getPermissions, updatePermissions,
  getTaskPermissions, updateTaskPermissions, getRoleDefaults
} from '../services/permissionService';
import {
  ChevronRight, Users, BarChart2,
  AlertTriangle, Package, Calendar, CreditCard, Save, Shield,
  Download, Filter, SlidersHorizontal, Lock, CheckCircle, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import ExportDialog from '../components/shared/ExportDialog';
import { downloadCsvFile } from '../lib/csvExport';
import { filterTaskPermissions } from '../lib/permissionsTaskFilters';
import { writeRowsToXlsx } from '../lib/xlsxExport';

const ADMIN_ROLES = ['Super Admin', 'Director', 'School Administrator'];

const DEFAULT_PERMS = {
  manageEmployees: false,
  viewReports: false,
  issueFines: false,
  manageInventory: false,
  manageSchedules: false,
  viewPayroll: false,
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
  const isAdmin = ADMIN_ROLES.includes(user?.designation);


  // ── Shared state ──
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openRoles, setOpenRoles] = useState(new Set());

  // ── Selection State ──
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // ── Global Permissions State ──
  const [globalPermissions, setGlobalPermissions] = useState({ ...DEFAULT_PERMS });

  // ── Task-based permission state ──
  const [roleDefaults, setRoleDefaults] = useState({});
  const [availableTaskPermissions, setAvailableTaskPermissions] = useState([]);
  const [taskOverrides, setTaskOverrides] = useState({});
  const [pendingOverrides, setPendingOverrides] = useState({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskPermTab, setTaskPermTab] = useState('all');
  const [taskPermSearch, setTaskPermSearch] = useState('');

  // Define properties dynamically using t() function
  const globalPermDefs = () => [
    { key: 'manageEmployees', label: t('Manage Employees'), desc: t('Create, edit or remove employee records.'), icon: Users },
    { key: 'viewReports', label: t('View Reports'), desc: t('Access reports, analytics, and data.'), icon: BarChart2 },
    { key: 'issueFines', label: t('Issue Fines'), desc: t('Raise fines against employee accounts.'), icon: AlertTriangle },
    { key: 'manageInventory', label: t('Manage Inventory'), desc: t('Add, edit, and update stock levels.'), icon: Package },
    { key: 'manageSchedules', label: t('Manage Schedules'), desc: t('Create shift schedules and duty rosters.'), icon: Calendar },
    { key: 'viewPayroll', label: t('View Payroll'), desc: t('Access salary records and payslips.'), icon: CreditCard },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [permRes, roleRes] = await Promise.all([
        getPermissions(),
        getRoleDefaults(),
      ]);
      const empData = permRes.data?.data || [];
      setEmployees(empData);
      setRoleDefaults(roleRes.data?.data?.rolePermissions || {});
      setAvailableTaskPermissions(roleRes.data?.data?.availableTaskPermissions || []);
      
      if (empData.length > 0) {
        selectEmployee(empData[0]);
      }
    } catch (err) {
      console.error('Failed to load permissions', err);
      toast.error('Failed to load personnel data.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [fetchData, isAdmin]);

  const loadTaskPerms = useCallback(async (empId) => {
    setTaskLoading(true);
    try {
      const res = await getTaskPermissions(empId);
      const data = res.data?.data;
      setTaskOverrides(data?.overrides || {});
      setPendingOverrides({});
    } catch (err) {
      console.error('Failed to load task permissions', err);
      toast.error('Failed to sync network states.');
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

  const toggleRole = useCallback((role) => {
    setOpenRoles(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  }, []);

  const toggleGlobalPerm = useCallback((key) => {
    setGlobalPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectEmployee = useCallback((emp) => {
    setSelectedEmployee(emp);
    setGlobalPermissions({ ...DEFAULT_PERMS, ...(emp.permissions || {}) });
    setPendingOverrides({});
    loadTaskPerms(emp.id);
  }, [loadTaskPerms]);

  const handleSaveAll = async () => {
    if (!selectedEmployee) return;
    setIsSaving(true);
    try {
      const reqs = [];
      reqs.push(updatePermissions([selectedEmployee.id], globalPermissions));
      
      const hasPendingChanges = Object.keys(pendingOverrides).length > 0;
      if (hasPendingChanges) {
        reqs.push(updateTaskPermissions(selectedEmployee.id, pendingOverrides));
      }

      await Promise.all(reqs);
      toast.success(t('Permissions securely uploaded to core servers.'));
      
      const res = await getPermissions();
      const updatedEmps = res.data?.data || [];
      setEmployees(updatedEmps);
      const updatedEmp = updatedEmps.find(e => e.id === selectedEmployee.id);
      if (updatedEmp) {
        setSelectedEmployee(updatedEmp);
        setGlobalPermissions({ ...DEFAULT_PERMS, ...(updatedEmp.permissions || {}) });
      }
      
      if (hasPendingChanges) {
        await loadTaskPerms(selectedEmployee.id);
      }
    } catch (err) {
      console.error('Failed to commit permission saves', err);
      toast.error(t('Permission synchronization failed.'));
    } finally {
      setIsSaving(false);
    }
  };

  const taskPermsList = useMemo(() => {
    if (!selectedEmployee) return [];
    const role = selectedEmployee.designation;
    const defaults = roleDefaults[role] || [];
    const allPerms = new Set([
      ...availableTaskPermissions,
      ...defaults,
      ...Object.keys(taskOverrides),
      ...Object.keys(pendingOverrides),
    ]);
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
  }, [selectedEmployee, roleDefaults, availableTaskPermissions, taskOverrides, pendingOverrides]);

  const filteredTaskPerms = useMemo(
    () => filterTaskPermissions(taskPermsList, taskPermTab, taskPermSearch),
    [taskPermSearch, taskPermTab, taskPermsList]
  );

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

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getPermissionExportRows = () => {
    if (!selectedEmployee) return [];

    return [
      ...globalPermDefs().map((perm) => ({
        'Section': 'Global Permission',
        'Employee': selectedEmployee.fullName,
        'Role': selectedEmployee.designation,
        'Permission': perm.label,
        'Key': perm.key,
        'Access': globalPermissions[perm.key] ? 'Enabled' : 'Disabled',
        'Source': 'Manual',
      })),
      ...taskPermsList.map((perm) => ({
        'Section': 'Task Override',
        'Employee': selectedEmployee.fullName,
        'Role': selectedEmployee.designation,
        'Permission': perm.label,
        'Key': perm.key,
        'Access': perm.effectiveValue ? 'Enabled' : 'Disabled',
        'Source': perm.hasPending ? 'Pending Change' : perm.hasOverride ? 'Manual Override' : 'Role Default',
      })),
    ];
  };

  const handleDownloadPermissionsCsv = () => {
    const rows = getPermissionExportRows();
    if (!rows.length) return;
    downloadCsvFile(rows, `permissions_${selectedEmployee?.fullName || 'export'}.csv`);
    toast.success('Permissions downloaded.');
  };

  const handleDownloadPermissionsExcel = async () => {
    const rows = getPermissionExportRows();
    if (!rows.length) return;
    await writeRowsToXlsx(rows, {
      sheetName: 'Permissions',
      fileName: `permissions_${selectedEmployee?.fullName || 'export'}.xlsx`,
    });
    toast.success('Permissions downloaded.');
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="label-sm text-muted-foreground text-[10px] truncate uppercase tracking-widest">ORGANIZATION &gt; SYSTEM SETTINGS &gt; <span className="text-primary">{t("PERMISSIONS MATRIX")}</span></p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">System <span className="text-primary">{t("Permissions")}</span></h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">{t("Configure global access matrices and individual task overrides. Changes are logged in real-time.")}</p>
        </div>
        <div className="flex flex-row-reverse sm:flex-row gap-2 shrink-0">
          <ExportDialog
            title={t("Export Permissions")}
            options={{
              xlsx: handleDownloadPermissionsExcel,
              csv: handleDownloadPermissionsCsv,
            }}
            trigger={(
              <button
                type="button"
                className="h-9 w-9 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center ml-auto sm:ml-0"
                aria-label={t("Export permissions")}
                title={t("Export permissions")}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          />
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || !selectedEmployee}
            className="btn-save-primary min-w-[100px] sm:ml-0"
          >
            {isSaving ? <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? t('SAVING...') : t('SAVE CHANGES')}
          </button>
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
              <input
                type="text"
                placeholder={t('Search staff...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredGroups.map(([role, emps]) => {
                const isOpen = openRoles.has(role);
                return (
                  <div key={role} className="mb-2">
                     {/* Role Header */}
                     <div 
                      className="flex items-center justify-between px-2 py-1.5 hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors"
                      onClick={() => toggleRole(role)}
                    >
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{role}</span>
                      <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                    {/* Role Users */}
                    {isOpen && (
                      <div className="mt-1 space-y-1 pl-2">
                        {emps.map(emp => {
                          const isSel = selectedEmployee?.id === emp.id;
                          return (
                            <button
                              key={emp.id}
                              onClick={() => selectEmployee(emp)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors border-l-2 ${isSel ? ' border-primary bg-primary/5' : 'border-transparent hover:bg-surface-container-high/50'}`}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 shadow-lg">
                                {getInitials(emp.fullName)}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm truncate font-bold ${isSel ? 'text-foreground' : 'text-muted-foreground'}`}>{emp.fullName}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{emp.employmentStatus || 'ACTIVE'}</p>
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
            <p className="label-sm text-muted-foreground mb-3 tracking-widest uppercase">{t('STATUS LEGEND')}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" /> <span className="text-foreground tracking-wide font-medium">{t("ROLE DEFAULT / INHERITED")}</span></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> <span className="text-foreground tracking-wide font-medium">{t("MANUAL OVERRIDE (DENIED)")}</span></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" /> <span className="text-foreground tracking-wide font-medium">{t("MANUAL OVERRIDE (GRANTED)")}</span></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" /> <span className="text-foreground tracking-wide font-medium">{t("UNSAVED PENDING CHANGE")}</span></div>
            </div>
          </div>
        </div>

        {/* Permission Panels Area */}
        {selectedEmployee ? (
          <div className="lg:col-span-9 space-y-6">
            
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]">
                  {getInitials(selectedEmployee.fullName)}
               </div>
               <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">{selectedEmployee.fullName}</h3>
                  <div className="flex items-center gap-2">
                     <p className="text-xs text-muted-foreground uppercase tracking-widest">{selectedEmployee.designation}</p>
                     <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  </div>
               </div>
            </div>

            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><Shield className="w-4 h-4 text-primary" /></div>
                <h3 className="heading-md text-foreground uppercase tracking-wider text-sm">{t("Global Permissions")}</h3>
              </div>
              <div className="space-y-1">
                {globalPermDefs().map((p) => {
                  const isOn = globalPermissions[p.key];
                  const Icon = p.icon;
                  return (
                    <div key={p.key} className="flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-surface-container-high/50">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{p.label}</p>
                        <p className="text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                      <div 
                        onClick={() => toggleGlobalPerm(p.key)}
                        className={`w-11 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors shrink-0 ${isOn ? 'bg-primary' : 'bg-surface-container-high border border-border'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operational Task Overrides View */}
            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow relative">
               {taskLoading && (
                  <div className="absolute inset-0 bg-surface-container-highest/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
               )}
               <div className="flex flex-col gap-3 mb-5">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><ActionIcon className="w-4 h-4 text-primary" /></div>
                     <h3 className="heading-md text-foreground uppercase tracking-wider text-sm">{t("Operational Task Overrides")}</h3>
                   </div>
                   <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground bg-surface-container-high px-3 py-1.5 rounded tracking-wider uppercase">TARGET: {selectedEmployee.fullName}</span>
                    <span className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px] font-bold flex items-center gap-1">{selectedEmployee.designation} <CheckCircle className="w-3 h-3" /></span>
                    {Object.keys(pendingOverrides).length > 0 && <span className="px-2 py-1 rounded bg-warning/20 text-warning text-[10px] font-bold flex items-center gap-1 animate-pulse"><AlertTriangle className="w-3 h-3" /> UNSAVED PROFILES</span>}
                   </div>
                 </div>
                 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                   <div className="inline-flex h-9 items-center gap-1 p-1 rounded-lg bg-surface-container-high border border-border self-start">
                     {['all', 'write', 'read'].map((tab) => {
                       const isActive = taskPermTab === tab;
                       return (
                         <button
                           key={tab}
                           type="button"
                           className={`h-7 px-3 rounded-md text-[10px] font-bold tracking-[0.18em] uppercase transition-colors ${
                             isActive
                               ? 'bg-primary text-primary-foreground'
                               : 'text-muted-foreground hover:text-foreground hover:bg-surface-container'
                           }`}
                           onClick={() => setTaskPermTab(tab)}
                         >
                           {tab}
                         </button>
                       );
                     })}
                   </div>
                            <input
                              type="text"
                              value={taskPermSearch}
                              onChange={(e) => setTaskPermSearch(e.target.value)}
                              placeholder="Search operational permissions"
                              className="perm-task-filter-search w-full sm:w-[240px] lg:w-[220px] h-8 lg:ml-auto rounded-lg border border-border bg-surface-container-high px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                 </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {filteredTaskPerms.map(perm => {
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
                           badgeText = perm.effectiveValue ? 'MANUAL OVERRIDE' : 'DENIED OVERRIDE';
                       } else {
                           if (perm.roleDefault) {
                               borderColor = 'border-primary';
                               bgColor = 'bg-surface-container-high/80 opacity-100';
                               badgeColor = 'bg-primary/20 text-primary';
                               badgeText = 'INHERITED';
                           }
                       }

                       return (
                         <div key={perm.key} className={`rounded-lg p-4 border cursor-pointer transition-all flex flex-col h-full ${borderColor} ${bgColor}`}>
                           <div className="flex items-start justify-between mb-3">
                             <div className={`w-8 h-8 rounded-lg ${perm.effectiveValue ? 'bg-primary/20' : 'bg-muted'} flex items-center justify-center transition-colors`}>
                                 <Shield className={`w-4 h-4 ${perm.effectiveValue ? 'text-primary' : 'text-muted-foreground'}`} />
                             </div>
                             <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${badgeColor}`}>
                               {badgeText}
                             </span>
                           </div>
                           <h4 className="font-bold text-foreground text-sm mb-1">{perm.label}</h4>
                           <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                             AUTHORITY IDENTIFIER: {perm.key}
                           </p>
                           <div className="flex items-center justify-between mt-auto">
                             <div className="flex items-center gap-1.5">
                               <span className={`label-sm ${perm.effectiveValue ? 'text-success' : 'text-muted-foreground'}`}>
                                 {perm.effectiveValue ? 'ACTIVE STATUS' : 'DISABLED'}
                               </span>
                               {perm.effectiveValue ? <CheckCircle className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                             </div>
                             <div className="flex items-center gap-2">
                               {(isOverride || isPending) && (
                                 <button
                                   className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                                   onClick={(e) => { e.stopPropagation(); resetTaskPerm(perm.key); }}
                                 >
                                   <RotateCcw size={10} />
                                 </button>
                               )}
                               <div 
                                 onClick={() => toggleTaskPerm(perm.key, perm.effectiveValue, perm.roleDefault, perm.hasOverride)}
                                 className={`w-11 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${perm.effectiveValue ? 'bg-primary' : 'bg-surface-container-high border border-border'}`}
                               >
                                 <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${perm.effectiveValue ? 'translate-x-5' : 'translate-x-0'}`} />
                               </div>
                             </div>
                           </div>
                         </div>
                       );
                 })}
                 {/* Append Task Node */}
                 {/* <div className="rounded-lg p-4 border border-dashed border-border flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors min-h-[160px]">
                   <Plus className="w-6 h-6 text-muted-foreground mb-2" />
                   <p className="label-sm text-muted-foreground">{t("APPEND TASK NODE")}</p>
                 </div> */}
                 {/* Empty State */}
                  {filteredTaskPerms.length === 0 && !taskLoading && (
                    <div className="rounded-lg p-4 border border-dashed border-border flex flex-col items-center justify-center text-center min-h-[160px] bg-surface-container/50">
                      <AlertTriangle className="w-6 h-6 text-muted-foreground mb-2" />
                      <p className="label-sm text-foreground uppercase tracking-widest font-bold">
                        {taskPermSearch.trim()
                          ? t("NO MATCHING TASKS")
                          : taskPermTab === 'write'
                            ? t("NO WRITE TASKS")
                            : taskPermTab === 'read'
                              ? t("NO READ TASKS")
                              : t("NO TASKS DEFINED")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                        {taskPermSearch.trim()
                          ? t("Try a different permission name or key.")
                          : taskPermTab === 'all'
                            ? t("This user role possesses zero default behaviors.")
                            : t("No permissions are available in this view.")}
                      </p>
                    </div>
                  )}
                </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-9 flex flex-col items-center justify-center text-center py-20 px-4 bg-surface-container-highest rounded-lg border border-border edge-glow min-h-[500px]">
             <Shield className="w-16 h-16 text-muted-foreground/30 mb-5" />
             <h3 className="text-xl font-bold text-foreground mb-2 uppercase tracking-widest">{t("Select an Employee Target")}</h3>
             <p className="text-sm text-muted-foreground max-w-sm">Choose an employee from the directory sidebar to visualize and alter global interface restrictions and specific operational task overrides.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple helper component purely to inject into the JSX.
const ActionIcon = ({ className }) => <Shield className={className} />;

export default PermissionsPage;
