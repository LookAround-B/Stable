import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import {
  Users, ClipboardList, CheckCircle2,
  Clock, BarChart3, ScrollText, ShieldCheck
} from 'lucide-react';
import { FaHorse } from 'react-icons/fa';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── Vibrant color palettes ───────────────────────────────
const COLORS = [
  '#6366f1', '#f43f5e', '#0ea5e9', '#f59e0b', '#10b981',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  '#a855f7', '#ef4444', '#22c55e', '#eab308', '#3b82f6',
  '#d946ef', '#84cc16', '#e11d48', '#0891b2', '#7c3aed',
];

const ATTENDANCE_COLORS = {
  Present: '#22c55e', Absent: '#ef4444', Leave: '#f59e0b', WOFF: '#6366f1', 'Half Day': '#3b82f6'
};

const GENDER_COLORS = {
  Stallion: '#3b82f6', Mare: '#ec4899', Gelding: '#8b5cf6', Colt: '#22c55e',
  Filly: '#f97316', Foal: '#06b6d4', Stud: '#ef4444', Male: '#3b82f6', Female: '#ec4899',
};

// ─── Counter animation hook ──────────────────────────────
const useCounterAnimation = (targetValue, duration = 1000) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    if (typeof targetValue !== 'number' || targetValue === 0) { setDisplayValue(targetValue); return; }
    let startTime = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      setDisplayValue(Math.floor(targetValue * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [targetValue, duration]);
  return displayValue;
};

// ─── Stat card ───────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, accent, to }) => {
  const navigate = useNavigate();
  const animatedValue = useCounterAnimation(typeof value === 'number' ? value : 0, 1200);
  const displayValue = typeof value === 'string' ? value : animatedValue;
  return (
    <div className={`dash-stat-card${to ? ' dash-stat-card--link' : ''}`}
      onClick={to ? () => navigate(to) : undefined} style={to ? { cursor: 'pointer' } : {}}>
      <div className="dash-stat-top">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-icon" style={accent ? { background: accent + '18', color: accent } : {}}>
          <Icon size={16} strokeWidth={1.8} />
        </span>
      </div>
      <div className="dash-stat-value">{displayValue}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
};

// ─── Custom pie label ────────────────────────────────────
const renderPieLabel = ({ name, percent }) => percent > 0.04 ? `${name} (${(percent * 100).toFixed(0)}%)` : '';

// ─── Chart card wrapper ──────────────────────────────────
const ChartCard = ({ title, children, className = '' }) => (
  <div className={`dash-chart-card ${className}`}>
    <h3 className="dash-chart-title">{title}</h3>
    {children}
  </div>
);

// ─── Main Dashboard ──────────────────────────────────────
const DashboardPage = () => {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const p = usePermissions();
  const [taskStats, setTaskStats] = useState({ pending: 0, completed: 0, total: 0 });
  const [horsesCount, setHorsesCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [auditLogsCount, setAuditLogsCount] = useState(0);
  const [approvalsCount, setApprovalsCount] = useState(0);

  // Chart data
  const [employeesByRole, setEmployeesByRole] = useState([]);
  const [employeesByGender, setEmployeesByGender] = useState([]);
  const [horsesByGender, setHorsesByGender] = useState([]);
  const [tasksByType, setTasksByType] = useState([]);
  const [gateEntries, setGateEntries] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [groceryData, setGroceryData] = useState([]);

  const dateLocales = { en: 'en-US', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN' };
  const today = new Date().toLocaleDateString(dateLocales[lang] || 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const hour = new Date().getHours();
  const getGreeting = () => {
    if (hour < 12) return t('GOOD MORNING,');
    if (hour < 17) return t('GOOD AFTERNOON,');
    return t('GOOD EVENING,');
  };

  useEffect(() => { loadAllStats(); }, []);

  const loadAllStats = async () => {
    // Core stats
    try {
      const [tasksRes, horsesRes, employeesRes] = await Promise.allSettled([
        apiClient.get('/tasks'),
        apiClient.get('/horses'),
        apiClient.get('/employees'),
      ]);

      if (tasksRes.status === 'fulfilled') {
        const tasks = tasksRes.value.data.data || tasksRes.value.data || [];
        const pending = tasks.filter(t => t.status === 'Pending').length;
        const completed = tasks.filter(t => t.status === 'Completed').length;
        setTaskStats({ pending, completed, total: tasks.length });
        setApprovalsCount(pending);

        // Tasks by type
        const typeCount = {};
        tasks.forEach(t => { typeCount[t.type || 'Other'] = (typeCount[t.type || 'Other'] || 0) + 1; });
        setTasksByType(Object.entries(typeCount).map(([name, value]) => ({ name, value })));
      }

      if (horsesRes.status === 'fulfilled') {
        const horses = horsesRes.value.data.data || horsesRes.value.data || [];
        setHorsesCount(Array.isArray(horses) ? horses.length : 0);
        // Horses by gender
        const genderCount = {};
        horses.forEach(h => { genderCount[h.gender || 'Unknown'] = (genderCount[h.gender || 'Unknown'] || 0) + 1; });
        setHorsesByGender(Object.entries(genderCount).map(([name, value]) => ({ name, value })));
      }

      if (employeesRes.status === 'fulfilled') {
        const employees = employeesRes.value.data.data || employeesRes.value.data || [];
        setEmployeesCount(Array.isArray(employees) ? employees.length : 0);
        // By role
        const roleCount = {};
        employees.forEach(e => { roleCount[e.designation || 'Other'] = (roleCount[e.designation || 'Other'] || 0) + 1; });
        setEmployeesByRole(Object.entries(roleCount).map(([name, value]) => ({ name, value })));
        // By gender (use designation to infer — most systems don't track employee gender; placeholder)
        // We'll show by department instead which is more useful
        const deptMap = {
          'Guard': 'Ground Ops', 'Gardener': 'Ground Ops', 'Housekeeping': 'Ground Ops',
          'Electrician': 'Ground Ops', 'Ground Supervisor': 'Ground Ops',
          'Groom': 'Stable Ops', 'Riding Boy': 'Stable Ops', 'Rider': 'Stable Ops',
          'Farrier': 'Stable Ops', 'Jamedar': 'Stable Ops', 'Instructor': 'Stable Ops', 'Stable Manager': 'Stable Ops',
          'Executive Admin': 'Accounts', 'Executive Accounts': 'Accounts', 'Senior Executive Accounts': 'Accounts',
          'Senior Executive Admin': 'Accounts', 'Junior Executive Admin': 'Accounts',
          'Restaurant Manager': 'Restaurant', 'Kitchen Helper': 'Restaurant', 'Waiter': 'Restaurant',
          'School Administrator': 'Leadership', 'Director': 'Leadership', 'Super Admin': 'Leadership',
        };
        const deptCount = {};
        employees.forEach(e => {
          const dept = deptMap[e.designation] || 'Other';
          deptCount[dept] = (deptCount[dept] || 0) + 1;
        });
        setEmployeesByGender(Object.entries(deptCount).map(([name, value]) => ({ name, value })));
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }

    // Audit logs
    try {
      const logsRes = await apiClient.get('/audit-logs');
      const logs = logsRes.data.data || logsRes.data || [];
      setAuditLogsCount(Array.isArray(logs) ? logs.length : 0);
    } catch { }

    // Gate entries (today)
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const gateRes = await apiClient.get(`/gate-entry/register?date=${todayStr}`);
      const entries = gateRes.data.data || gateRes.data || [];
      const typeCount = {};
      entries.forEach(e => { typeCount[e.personType || 'Other'] = (typeCount[e.personType || 'Other'] || 0) + 1; });
      setGateEntries(Object.entries(typeCount).map(([name, value]) => ({ name, value })));
    } catch { }

    // Attendance (today)
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const attRes = await apiClient.get(`/attendance/daily?date=${todayStr}`);
      const records = attRes.data.data || attRes.data || [];
      const statusCount = {};
      records.forEach(r => { statusCount[r.status || 'Unknown'] = (statusCount[r.status || 'Unknown'] || 0) + 1; });
      setAttendanceData(Object.entries(statusCount).map(([name, value]) => ({ name, value })));
    } catch { }

    // Grocery inventory
    try {
      const now = new Date();
      const grocRes = await apiClient.get(`/groceries-inventory?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      const items = grocRes.data.data || grocRes.data || [];
      // Top 10 items by quantity
      const sorted = [...items].sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).slice(0, 10);
      setGroceryData(sorted.map(i => ({ name: i.name?.substring(0, 20) || 'Item', quantity: i.quantity || 0, unit: i.unit || '' })));
    } catch { }
  };

  const completionRate = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  // ─── Stat cards by role ─────────────────────────────────
  const renderCards = () => {
    const role = user?.designation;
    switch (role) {
      case 'Super Admin':
        return <>
          <StatCard icon={FaHorse} label={t("TOTAL HORSES")} value={horsesCount} sub={t("Registered in system")} accent="#6366f1" to="/horses" />
          <StatCard icon={Users} label={t("TOTAL EMPLOYEES")} value={employeesCount} sub={t("Active team members")} accent="#0ea5e9" to="/employees" />
          <StatCard icon={Clock} label={t("PENDING TASKS")} value={taskStats.pending} sub={t("Awaiting action")} accent="#f59e0b" />
          <StatCard icon={ScrollText} label={t("AUDIT LOGS")} value={auditLogsCount} sub={t("System events")} accent="#10b981" />
        </>;
      case 'Admin':
        return <>
          <StatCard icon={FaHorse} label={t("TOTAL HORSES")} value={horsesCount} sub={t("Registered in system")} accent="#6366f1" to="/horses" />
          <StatCard icon={Users} label={t("TOTAL EMPLOYEES")} value={employeesCount} sub={t("Active team members")} accent="#0ea5e9" to="/employees" />
          <StatCard icon={Clock} label={t("PENDING TASKS")} value={taskStats.pending} sub={t("Awaiting action")} accent="#f59e0b" />
          <StatCard icon={ShieldCheck} label={t("PENDING APPROVALS")} value={approvalsCount} sub={t("Awaiting your review")} accent="#ef4444" />
        </>;
      case 'Zamindar':
        return <>
          <StatCard icon={ClipboardList} label={t("PENDING TASKS")} value={taskStats.total} sub={t("Total assigned")} accent="#6366f1" />
          <StatCard icon={Clock} label={t("PENDING APPROVALS")} value={taskStats.pending} sub={t("In queue")} accent="#f59e0b" />
          <StatCard icon={FaHorse} label={t("TOTAL HORSES")} value={horsesCount} sub={t("Under management")} accent="#10b981" to="/horses" />
          <StatCard icon={Users} label={t("TOTAL EMPLOYEES")} value={employeesCount} sub={t("Active team members")} accent="#0ea5e9" to="/employees" />
        </>;
      case 'Instructor':
        return <>
          <StatCard icon={ClipboardList} label={t("Training Tasks")} value={taskStats.total} sub={t("Assigned to you")} accent="#6366f1" />
          <StatCard icon={FaHorse} label={t("TOTAL HORSES")} value={horsesCount} sub={t("Active horses")} accent="#10b981" to="/horses" />
          <StatCard icon={CheckCircle2} label={t("Completed")} value={taskStats.completed} sub={t("This period")} accent="#0ea5e9" />
        </>;
      case 'Health Advisor':
        return <>
          <StatCard icon={ScrollText} label={t("Health Records")} value={horsesCount} sub={t("Total horses tracked")} accent="#6366f1" to="/horses" />
          <StatCard icon={Clock} label={t("PENDING TASKS")} value={taskStats.pending} sub={t("Awaiting action")} accent="#f59e0b" />
          <StatCard icon={FaHorse} label={t("TOTAL HORSES")} value={horsesCount} sub={t("In facility")} accent="#10b981" to="/horses" />
        </>;
      case 'Jamedar':
        return <>
          <StatCard icon={ClipboardList} label={t("Assigned Tasks")} value={taskStats.total} sub={t("Total workload")} accent="#6366f1" />
          <StatCard icon={Clock} label={t("Pending")} value={taskStats.pending} sub={t("Not yet done")} accent="#f59e0b" />
          <StatCard icon={CheckCircle2} label={t("Completed")} value={taskStats.completed} sub={t("Finished tasks")} accent="#10b981" />
          <StatCard icon={BarChart3} label={t("Completion Rate")} value={`${completionRate}%`} sub={t("Overall progress")} accent="#0ea5e9" />
        </>;
      case 'Groomer':
      default:
        return <>
          <StatCard icon={ClipboardList} label={t("Daily Tasks")} value={taskStats.total} sub={t("Assigned today")} accent="#6366f1" />
          <StatCard icon={Clock} label={t("Pending")} value={taskStats.pending} sub={t("Still to do")} accent="#f59e0b" />
          <StatCard icon={CheckCircle2} label={t("Completed")} value={taskStats.completed} sub={t("Done today")} accent="#10b981" />
          <StatCard icon={BarChart3} label={t("Completion Rate")} value={`${completionRate}%`} sub={t("Your progress")} accent="#0ea5e9" />
        </>;
    }
  };

  // ─── Permission-based chart sections (roles with access) ──
  const permData = [
    { name: 'Stable Ops', perms: 8 },
    { name: 'Ground Ops', perms: 5 },
    { name: 'Accounts', perms: 4 },
    { name: 'Restaurant', perms: 3 },
    { name: 'Leadership', perms: 12 },
  ];

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <div>
          <p className="dash-greeting">{getGreeting()}</p>
          <h1 className="dash-name">{user?.fullName || 'User'}</h1>
          <p className="dash-role">{t(user?.designation)}</p>
        </div>
        <div className="dash-date">{today}</div>
      </div>

      {/* Stat cards */}
      <div className="dashboard-grid">
        {renderCards()}
      </div>

      {/* Charts Section */}
      {p.isAdmin && (
        <div className="dash-charts-section">

          {/* Row 1: Team + Horses */}
          <div className="dash-charts-row">
            {/* Team by Role — Bar chart */}
            {employeesByRole.length > 0 && (
              <ChartCard title={t("Team by Role")} className="dash-chart-hide-mobile">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={employeesByRole} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #eee)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card, #fff)' }} />
                    <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                      {employeesByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Team by Department — Pie chart */}
            {employeesByGender.length > 0 && (
              <ChartCard title={t("Team by Department")}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={employeesByGender} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                      label={renderPieLabel} labelLine={{ stroke: '#aaa' }} paddingAngle={3}>
                      {employeesByGender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Row 2: Horses Gender + Tasks Type */}
          <div className="dash-charts-row">
            {/* Horses by Gender — Pie chart */}
            {horsesByGender.length > 0 && (
              <ChartCard title={t("Horses by Gender")}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={horsesByGender} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                      label={renderPieLabel} labelLine={{ stroke: '#aaa' }} paddingAngle={3}>
                      {horsesByGender.map((entry, i) => (
                        <Cell key={i} fill={GENDER_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Tasks by Type — Bar chart */}
            {tasksByType.length > 0 && (
              <ChartCard title={t("Tasks by Type")}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={tasksByType} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #eee)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card, #fff)' }} />
                    <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                      {tasksByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Row 3: Gate Entry + Attendance */}
          <div className="dash-charts-row">
            {/* Gate Register — Pie chart */}
            {gateEntries.length > 0 && (
              <ChartCard title={t("Gate Register (Today)")}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={gateEntries} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                      label={renderPieLabel} labelLine={{ stroke: '#aaa' }} paddingAngle={5}>
                      {gateEntries.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Attendance — Pie chart */}
            {attendanceData.length > 0 && (
              <ChartCard title={t("Attendance (Today)")}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={attendanceData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value"
                      label={renderPieLabel} labelLine={{ stroke: '#aaa' }} paddingAngle={5}>
                      {attendanceData.map((entry, i) => (
                        <Cell key={i} fill={ATTENDANCE_COLORS[entry.name] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Row 4: Grocery Inventory + Permissions */}
          <div className="dash-charts-row">
            {/* Grocery Inventory — Bar chart */}
            {groceryData.length > 0 && (
              <ChartCard title={t("Grocery Inventory (Top 10)")}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={groceryData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #eee)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card, #fff)' }}
                      formatter={(val, _, item) => [`${val} ${item.payload.unit}`, 'Stock']} />
                    <Bar dataKey="quantity" name="Stock" radius={[6, 6, 0, 0]}>
                      {groceryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Permissions by Department — Bar chart */}
            <ChartCard title={t("Permissions by Department")}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={permData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #eee)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card, #fff)' }} />
                  <Bar dataKey="perms" name="Permission Count" radius={[0, 6, 6, 0]}>
                    {permData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

        </div>
      )}
    </div>
  );
};

export default DashboardPage;
