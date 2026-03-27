import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CheckSquare,
  Cog,
  Download,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiClient from '../services/apiClient';
import EmployeeFaceIcon from '../components/EmployeeFaceIcon';
import HorseIcon from '../components/HorseIcon';
import usePermissions from '../hooks/usePermissions';
import Skeleton from '../components/Skeleton';

const CHART_COLORS = ['#d199ff', '#22c55e', '#60a5fa', '#fb7185', '#f59e0b', '#14b8a6', '#f97316', '#a855f7'];
const GENDER_COLORS = {
  Stallion: '#60a5fa',
  Mare: '#fb7185',
  Gelding: '#a855f7',
  Colt: '#22c55e',
  Filly: '#f97316',
  Foal: '#14b8a6',
  Male: '#60a5fa',
  Female: '#fb7185',
  Unknown: '#94a3b8',
};
const DEPARTMENT_MAP = {
  Guard: 'Ground Ops',
  Gardener: 'Ground Ops',
  Housekeeping: 'Ground Ops',
  Electrician: 'Ground Ops',
  'Ground Supervisor': 'Ground Ops',
  Groom: 'Stable Ops',
  'Riding Boy': 'Stable Ops',
  Rider: 'Stable Ops',
  Farrier: 'Stable Ops',
  Jamedar: 'Stable Ops',
  Instructor: 'Stable Ops',
  'Stable Manager': 'Stable Ops',
  'Executive Admin': 'Accounts',
  'Executive Accounts': 'Accounts',
  'Senior Executive Accounts': 'Accounts',
  'Senior Executive Admin': 'Accounts',
  'Junior Executive Admin': 'Accounts',
  'Restaurant Manager': 'Restaurant',
  'Kitchen Helper': 'Restaurant',
  Waiter: 'Restaurant',
  'School Administrator': 'Leadership',
  Director: 'Leadership',
  'Super Admin': 'Leadership',
};
const EXPENSE_DEPARTMENT_MAP = {
  Medicine: 'Stable Ops',
  Treatment: 'Stable Ops',
  Maintenance: 'Ground Ops',
  Miscellaneous: 'Accounts',
};
const ROLE_LABEL_SHORT_MAP = {
  'Executive Admin': 'Exe. admin',
  'Executive Accounts': 'Exe. acc.',
  'Junior Executive Admin': 'Jr. exe. admin',
  'Junior Executive Accounts': 'Jr. exe. acc.',
  'Senior Executive Admin': 'Sen. exe. admin',
  'Senior Executive Accounts': 'Sen. exe. acc.',
  'School Administrator': 'School admin',
  'Restaurant Manager': 'Rest. manager',
  'Ground Supervisor': 'Ground sup.',
  'Stable Manager': 'Stable manager',
  'Kitchen Helper': 'Kitchen helper',
  'Riding Boy': 'Riding boy',
  'Super Admin': 'Super admin',
};
const tooltipStyle = {
  background: 'var(--analysis-tooltip-bg)',
  border: '1px solid var(--analysis-tooltip-border)',
  borderRadius: 10,
  fontSize: 11,
  color: 'var(--analysis-tooltip-text)',
  padding: '8px 12px',
};

const getArray = (payload) => payload?.data || payload?.expenses || payload || [];

const getDateValue = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};

const createMonthBuckets = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      month: date.getMonth(),
      year: date.getFullYear(),
    };
  });
};

const formatRoleLabel = (role) => ROLE_LABEL_SHORT_MAP[role] || role;

const buildMetricSpark = (items, getItemDate, getItemValue = () => 1, { cumulative = false, fallbackTotal = 0 } = {}) => {
  const buckets = createMonthBuckets().map((bucket) => ({
    ...bucket,
    value: 0,
  }));
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  items.forEach((item) => {
    const date = getItemDate(item);
    if (!date) return;
    const bucket = bucketMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (!bucket) return;
    bucket.value += getItemValue(item);
  });

  const values = buckets.map((bucket) => bucket.value);

  if (cumulative) {
    let running = 0;
    return values.map((value) => {
      running += value;
      return running;
    });
  }

  if (values.every((value) => value === 0) && fallbackTotal) {
    return buckets.map((_, index) => Math.max(1, Math.round((fallbackTotal * (index + 1)) / buckets.length)));
  }

  return values;
};

const buildTrendData = (horses, employees, tasks, overallScore) => {
  const buckets = createMonthBuckets().map((bucket) => ({
    ...bucket,
    horses: 0,
    staff: 0,
    score: 0,
    completed: 0,
    totalTasks: 0,
  }));

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  horses.forEach((horse) => {
    const date = getDateValue(horse.createdAt, horse.updatedAt, horse.dateOfBirth);
    if (!date) return;
    const bucket = bucketMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.horses += 1;
  });

  employees.forEach((employee) => {
    const date = getDateValue(employee.createdAt, employee.updatedAt);
    if (!date) return;
    const bucket = bucketMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.staff += 1;
  });

  tasks.forEach((task) => {
    const date = getDateValue(task.createdAt, task.updatedAt, task.scheduledDatetime, task.scheduledDate);
    if (!date) return;
    const bucket = bucketMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (!bucket) return;
    bucket.totalTasks += 1;
    if (['Completed', 'Approved'].includes(task.status)) {
      bucket.completed += 1;
    }
  });

  return buckets.map((bucket) => ({
    month: bucket.label,
    horses: bucket.horses || horses.length,
    staff: bucket.staff || employees.length,
    score: bucket.totalTasks ? Math.round((bucket.completed / bucket.totalTasks) * 100) : overallScore,
  }));
};

const normalizeSparkData = (values = [], count = 6) => {
  const sliced = values.slice(-count);
  const padding = Math.max(0, count - sliced.length);
  return Array.from({ length: count }, (_, index) => {
    if (index < padding) return 0;
    return Number(sliced[index - padding]) || 0;
  });
};

const useCounter = (target, duration = 1000) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const numericTarget = typeof target === 'number' ? target : 0;
    if (!numericTarget) {
      setValue(0);
      return undefined;
    }

    const start = Date.now();
    let frame;

    const animate = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(numericTarget * eased));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
};

const AnalysisPageSkeleton = () => (
  <div className="analysis-page lovable-page-shell analysis-page-skeleton">
    <div className="analysis-toolbar">
      <div>
        <Skeleton variant="text" width={110} height={10} />
        <Skeleton variant="text" width={160} height={26} style={{ marginTop: 10 }} />
      </div>
      <div className="analysis-toolbar-actions">
        <Skeleton variant="rounded" width={92} height={34} />
      </div>
    </div>

    <div className="analysis-kpi-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="analysis-kpi-card">
          <Skeleton variant="rounded" width={42} height={42} />
          <Skeleton variant="text" width="54%" height={10} style={{ marginTop: 16 }} />
          <Skeleton variant="text" width="36%" height={26} style={{ marginTop: 10 }} />
          <Skeleton variant="text" width="62%" height={10} style={{ marginTop: 12 }} />
        </div>
      ))}
    </div>

    <div className="analysis-chart-grid">
      <div className="analysis-chart-card analysis-chart-card--wide">
        <Skeleton variant="text" width={180} height={14} />
        <Skeleton variant="text" width={120} height={10} style={{ marginTop: 6 }} />
        <Skeleton variant="rounded" width="100%" height={260} style={{ marginTop: 18 }} />
      </div>
      <div className="analysis-chart-card">
        <Skeleton variant="text" width={120} height={14} />
        <Skeleton variant="text" width={90} height={10} style={{ marginTop: 6 }} />
        <Skeleton variant="circular" width={200} height={200} style={{ margin: '18px auto 0' }} />
      </div>
      <div className="analysis-chart-card">
        <Skeleton variant="text" width={140} height={14} />
        <Skeleton variant="rounded" width="100%" height={240} style={{ marginTop: 18 }} />
      </div>
      <div className="analysis-chart-card">
        <Skeleton variant="text" width={120} height={14} />
        <Skeleton variant="circular" width={180} height={180} style={{ margin: '18px auto 0' }} />
      </div>
    </div>
  </div>
);

const KpiTile = ({ icon: Icon, watermarkIcon: WatermarkIcon = HorseIcon, label, value, subtitle, colorClass, sparkData = [] }) => {
  const animatedValue = useCounter(typeof value === 'number' ? value : 0);
  const displayValue = typeof value === 'number' ? animatedValue : value;
  const normalizedSpark = normalizeSparkData(sparkData);
  const maxSpark = Math.max(...normalizedSpark, 0);

  return (
    <div className="analysis-kpi-card">
      <div className={`analysis-kpi-icon ${colorClass}`}>
        {Icon === HorseIcon || Icon === EmployeeFaceIcon ? <Icon className="analysis-kpi-icon-svg" /> : <Icon size={18} />}
      </div>
      <div className="analysis-kpi-label">{label}</div>
      <div className="analysis-kpi-value">{displayValue}</div>
      <div className="analysis-kpi-footer">
        <div className="analysis-kpi-sub">{subtitle}</div>
        {normalizedSpark.some((entry) => entry > 0) && (
          <div className="analysis-kpi-spark" aria-hidden="true">
            {normalizedSpark.map((entry, index) => (
              <span key={index} style={{ height: `${maxSpark ? (entry / maxSpark) * 100 : 0}%` }} />
            ))}
          </div>
        )}
      </div>
      <div className="analysis-kpi-watermark">
        <WatermarkIcon />
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`analysis-chart-card ${className}`}>
    <div className="analysis-chart-head">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
    <div className="analysis-chart-body">{children}</div>
  </div>
);

const EmptyState = ({ label }) => <div className="analysis-empty">{label}</div>;

function AnalysisPage() {
  const permissions = usePermissions();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    metrics: { totalHorses: 0, activeStaff: 0, taskCompletion: 0, operationalScore: 0 },
    kpiSparks: { horses: [], staff: [], taskCompletion: [], operationalScore: [] },
    monthlyTrend: [],
    teamByRole: [],
    taskStatus: [],
    horseCoats: [],
    teamByDepartment: [],
    transactionsByDepartment: [],
    horsesByGender: [],
    healthMix: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadAnalysis = async () => {
      setLoading(true);
      try {
        const [tasksRes, horsesRes, employeesRes, expensesRes, auditRes, healthRes] = await Promise.allSettled([
          apiClient.get('/tasks'),
          apiClient.get('/horses'),
          apiClient.get('/employees'),
          apiClient.get('/expenses', { params: { limit: 1000 } }),
          apiClient.get('/audit-logs', { params: { take: 1000 } }),
          apiClient.get('/health-records', { params: { take: 1000 } }),
        ]);

        const tasks = tasksRes.status === 'fulfilled' ? getArray(tasksRes.value.data) : [];
        const horses = horsesRes.status === 'fulfilled' ? getArray(horsesRes.value.data) : [];
        const employees = employeesRes.status === 'fulfilled' ? getArray(employeesRes.value.data) : [];
        const expensesPayload = expensesRes.status === 'fulfilled' ? expensesRes.value.data : [];
        const expenses = Array.isArray(expensesPayload?.expenses) ? expensesPayload.expenses : getArray(expensesPayload);
        const auditLogs = auditRes.status === 'fulfilled' ? getArray(auditRes.value.data) : [];
        const healthRecords = healthRes.status === 'fulfilled' ? getArray(healthRes.value.data) : [];

        const approvedEmployees = employees.filter((employee) => employee.isApproved).length;
        const activeStaff = employees.filter((employee) => (employee.employmentStatus || '').toLowerCase() === 'active').length || approvedEmployees;
        const completedTasks = tasks.filter((task) => ['Completed', 'Approved'].includes(task.status)).length;
        const taskCompletion = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
        const assignmentRate = horses.length ? Math.round((horses.filter((horse) => horse.supervisorId || horse.supervisor).length / horses.length) * 100) : 0;
        const healthCoverage = horses.length ? Math.min(100, Math.round((healthRecords.length / horses.length) * 100)) : 0;
        const auditScore = Math.max(0, 100 - Math.min(auditLogs.length, 100));
        const operationalScore = Math.round((taskCompletion + assignmentRate + healthCoverage + auditScore) / 4);

        const roleCount = {};
        employees.forEach((employee) => {
          const role = employee.designation || 'Other';
          roleCount[role] = (roleCount[role] || 0) + 1;
        });

        const teamByRole = Object.entries(roleCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([role, count], index) => ({
            role,
            count,
            fill: CHART_COLORS[index % CHART_COLORS.length],
          }));

        const deptCount = {};
        employees.forEach((employee) => {
          const department = DEPARTMENT_MAP[employee.designation] || 'Other';
          deptCount[department] = (deptCount[department] || 0) + 1;
        });
        const deptEntries = Object.entries(deptCount).sort((a, b) => b[1] - a[1]);
        const deptTotal = deptEntries.reduce((sum, [, value]) => sum + value, 0);
        const teamByDepartment = deptEntries.map(([name, value], index) => ({
          name,
          value,
          fill: CHART_COLORS[index % CHART_COLORS.length],
          percent: deptTotal ? Math.round((value / deptTotal) * 100) : 0,
        }));

        const taskStatusCount = {};
        tasks.forEach((task) => {
          const status = task.status || 'Unknown';
          taskStatusCount[status] = (taskStatusCount[status] || 0) + 1;
        });
        const taskStatus = Object.entries(taskStatusCount).map(([name, value], index) => ({
          name,
          value,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }));

        const horseCoatCount = {};
        horses.forEach((horse) => {
          const coat = horse.color || 'Unknown';
          horseCoatCount[coat] = (horseCoatCount[coat] || 0) + 1;
        });
        const horseCoats = Object.entries(horseCoatCount).map(([name, value], index) => ({
          name,
          value,
          fill: ['#8b5e3c', '#4b5563', '#c08457', '#0f172a', '#d199ff'][index % 5],
        }));

        const horsesByGenderCount = {};
        horses.forEach((horse) => {
          const gender = horse.gender || 'Unknown';
          horsesByGenderCount[gender] = (horsesByGenderCount[gender] || 0) + 1;
        });
        const horsesByGender = Object.entries(horsesByGenderCount).map(([name, value], index) => ({
          name,
          value,
          fill: GENDER_COLORS[name] || CHART_COLORS[index % CHART_COLORS.length],
        }));

        const transactionTotals = {};
        expenses.forEach((expense) => {
          const department = EXPENSE_DEPARTMENT_MAP[expense.type] || 'Leadership';
          transactionTotals[department] = (transactionTotals[department] || 0) + (parseFloat(expense.amount) || 0);
        });
        const transactionsByDepartment = Object.entries(transactionTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([department, value], index) => ({
            department,
            value,
            fill: CHART_COLORS[index % CHART_COLORS.length],
          }));

        const healthMixCount = {};
        healthRecords.forEach((record) => {
          const type = record.recordType || 'General';
          healthMixCount[type] = (healthMixCount[type] || 0) + 1;
        });
        const healthMix = Object.entries(healthMixCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value], index) => ({
            name,
            value,
            fill: CHART_COLORS[index % CHART_COLORS.length],
          }));

        const monthlyTrend = buildTrendData(horses, employees, tasks, operationalScore);
        const kpiSparks = {
          horses: buildMetricSpark(
            horses,
            (horse) => getDateValue(horse.createdAt, horse.updatedAt, horse.dateOfBirth),
            () => 1,
            { cumulative: true, fallbackTotal: horses.length }
          ),
          staff: buildMetricSpark(
            employees,
            (employee) => getDateValue(employee.createdAt, employee.updatedAt),
            () => 1,
            { cumulative: true, fallbackTotal: activeStaff }
          ),
          taskCompletion: buildMetricSpark(
            tasks,
            (task) => getDateValue(task.createdAt, task.updatedAt, task.scheduledDatetime, task.scheduledDate),
            (task) => (['Completed', 'Approved'].includes(task.status) ? 1 : 0),
            { fallbackTotal: completedTasks }
          ),
          operationalScore: monthlyTrend.map((entry) => entry.score),
        };

        if (!cancelled) {
          setData({
            metrics: {
              totalHorses: horses.length,
              activeStaff,
              taskCompletion,
              operationalScore,
            },
            kpiSparks,
            monthlyTrend,
            teamByRole,
            taskStatus,
            horseCoats,
            teamByDepartment,
            transactionsByDepartment,
            horsesByGender,
            healthMix,
          });
        }
      } catch (error) {
        console.error('Error loading analysis:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, []);

  const exportAnalysis = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const transactionMax = useMemo(
    () => Math.max(...data.transactionsByDepartment.map((entry) => entry.value), 0),
    [data.transactionsByDepartment]
  );
  const taskTotal = useMemo(
    () => data.taskStatus.reduce((sum, entry) => sum + entry.value, 0),
    [data.taskStatus]
  );
  const departmentTotal = useMemo(
    () => data.teamByDepartment.reduce((sum, entry) => sum + entry.value, 0),
    [data.teamByDepartment]
  );
  const horseGenderTotal = useMemo(
    () => data.horsesByGender.reduce((sum, entry) => sum + entry.value, 0),
    [data.horsesByGender]
  );

  if (!permissions.viewDashboard) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return <AnalysisPageSkeleton />;
  }

  return (
    <div className="analysis-page lovable-page-shell">
      <div className="analysis-page-header">
        <div>
          <div className="lovable-header-kicker">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>Intelligence Center</span>
          </div>
          <h1 className="analysis-title">Analysis</h1>
          <p className="info-text">Operational intelligence across horses, staff, tasks, and expenses.</p>
        </div>
        <div className="lovable-header-actions">
          <button className="analysis-toolbar-btn" type="button" onClick={exportAnalysis}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="analysis-kpi-grid">
        <KpiTile icon={HorseIcon} watermarkIcon={HorseIcon} label="Total Horses" value={data.metrics.totalHorses} subtitle="+ live facility count" colorClass="primary" sparkData={data.kpiSparks.horses} />
        <KpiTile icon={EmployeeFaceIcon} watermarkIcon={EmployeeFaceIcon} label="Active Staff" value={data.metrics.activeStaff} subtitle="Current approved workforce" colorClass="success" sparkData={data.kpiSparks.staff} />
        <KpiTile icon={CheckSquare} label="Task Completion" value={`${data.metrics.taskCompletion}%`} subtitle="Completed vs total tasks" colorClass="primary" sparkData={data.kpiSparks.taskCompletion} />
        <KpiTile icon={Cog} label="Operational Score" value={data.metrics.operationalScore} subtitle="Derived from live backend data" colorClass="success" sparkData={data.kpiSparks.operationalScore} />
      </div>

      <div className="analysis-chart-grid">
        <ChartCard title="Facility Growth Trend" subtitle="Monthly overview" className="analysis-chart-card--wide">
          {data.monthlyTrend.length === 0 ? <EmptyState label="No monthly trend data available" /> : (
            <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={260}>
              <AreaChart data={data.monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="analysisHorses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d199ff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d199ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="analysisStaff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--lovable-text-soft)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--lovable-text-soft)' }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="monotone" dataKey="horses" stroke="#d199ff" strokeWidth={2.5} fill="url(#analysisHorses)" name="Horses" />
                <Area type="monotone" dataKey="staff" stroke="#22c55e" strokeWidth={2.5} fill="url(#analysisStaff)" name="Staff" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Op. Score" subtitle="Current rating">
          <div className="analysis-gauge-wrap">
            <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={220}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="62%" outerRadius="90%" data={[{ name: 'Score', value: data.metrics.operationalScore, fill: '#d199ff' }]} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(255,255,255,0.08)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="analysis-gauge-center">
              <strong>{data.metrics.operationalScore}</strong>
              <span>/ 100</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Staff by Role" subtitle="Distribution">
          {data.teamByRole.length === 0 ? <EmptyState label="No role data available" /> : (
            <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={240}>
              <BarChart data={data.teamByRole} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--lovable-text-soft)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="role" type="category" width={90} tick={{ fontSize: 9, fill: 'var(--lovable-text-soft)' }} tickFormatter={formatRoleLabel} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                  {data.teamByRole.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Task Status" subtitle="Current breakdown">
          {data.taskStatus.length === 0 ? <EmptyState label="No task data available" /> : (
            <>
              <div className="analysis-donut-wrap">
                <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={200}>
                  <PieChart>
                    <Pie data={data.taskStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={74} strokeWidth={0}>
                      {data.taskStatus.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="analysis-donut-center">
                  <strong>{taskTotal}</strong>
                  <span>Tasks</span>
                </div>
              </div>
              <div className="analysis-inline-legend">
                {data.taskStatus.map((entry) => (
                  <span key={entry.name}>
                    <i style={{ background: entry.fill }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Horses by Coat" subtitle="Color distribution">
          {data.horseCoats.length === 0 ? <EmptyState label="No horse coat data available" /> : (
            <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={220}>
              <PieChart>
                <Pie data={data.horseCoats} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={72} strokeWidth={2} stroke="var(--analysis-pie-stroke)">
                  {data.horseCoats.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Department Allocation" subtitle="Team distribution" className="analysis-chart-card--half">
          {data.teamByDepartment.length === 0 ? <EmptyState label="No department data available" /> : (
            <div className="analysis-split">
              <div className="analysis-donut-wrap analysis-donut-wrap--side">
                <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={220}>
                  <PieChart>
                    <Pie data={data.teamByDepartment} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={82} strokeWidth={0}>
                      {data.teamByDepartment.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="analysis-donut-center">
                  <strong>{departmentTotal}</strong>
                  <span>Staff</span>
                </div>
              </div>
              <div className="analysis-legend-stack analysis-legend-stack--compact">
                {data.teamByDepartment.map((entry) => (
                  <div key={entry.name} className="analysis-legend-row">
                    <div className="analysis-legend-label">
                      <i style={{ background: entry.fill }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="analysis-legend-value">{entry.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Financial Overview" subtitle="Expenses by department" className="analysis-chart-card--half">
          {data.transactionsByDepartment.length === 0 ? <EmptyState label="No expense data available" /> : (
            <div className="analysis-financial-list">
              {data.transactionsByDepartment.map((entry) => {
                const percent = transactionMax ? (entry.value / transactionMax) * 100 : 0;
                return (
                  <div key={entry.department} className="analysis-financial-row">
                    <div className="analysis-financial-top">
                      <span>{entry.department}</span>
                      <strong>{`\u20B9${Math.round(entry.value).toLocaleString('en-IN')}`}</strong>
                    </div>
                    <div className="analysis-progress-bar">
                      <span style={{ width: `${percent}%`, background: entry.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="analysis-chart-grid analysis-chart-grid--bottom">
        <ChartCard title="Horse Inventory by Gender" subtitle="Live backend distribution" className="analysis-chart-card--half">
          {data.horsesByGender.length === 0 ? <EmptyState label="No gender data available" /> : (
            <div className="analysis-split">
              <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={220}>
                <PieChart>
                  <Pie data={data.horsesByGender} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={76} strokeWidth={0}>
                    {data.horsesByGender.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="analysis-legend-stack">
                {data.horsesByGender.map((entry) => (
                  <div key={entry.name} className="analysis-legend-row">
                    <div className="analysis-legend-label">
                      <i style={{ background: entry.fill }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="analysis-legend-value">{horseGenderTotal ? Math.round((entry.value / horseGenderTotal) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Health Record Mix" subtitle="Current medical workload" className="analysis-chart-card--half">
          {data.healthMix.length === 0 ? <EmptyState label="No health record data available" /> : (
            <div className="analysis-financial-list">
              {data.healthMix.map((entry) => {
                const maxValue = Math.max(...data.healthMix.map((item) => item.value), 0);
                const percent = maxValue ? (entry.value / maxValue) * 100 : 0;
                return (
                  <div key={entry.name} className="analysis-financial-row">
                    <div className="analysis-financial-top">
                      <span>{entry.name}</span>
                      <strong>{entry.value}</strong>
                    </div>
                    <div className="analysis-progress-bar">
                      <span style={{ width: `${percent}%`, background: entry.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default AnalysisPage;
