import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import apiClient from '../services/apiClient';
import EmployeeFaceIcon from '../components/EmployeeFaceIcon';
import HorseIcon from '../components/HorseIcon';
import { CheckSquare, NotebookPen, Package } from 'lucide-react';
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis
} from 'recharts';

const DATE_LOCALES = { en: 'en-US', hi: 'hi-IN', te: 'te-IN', kn: 'kn-IN' };
const RUPEE = '\u20B9';
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
const CHART_COLORS = ['#d199ff', '#a855f7', '#00e6c7', '#fb7185', '#f59e0b', '#60a5fa', '#22c55e', '#f97316'];
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
const formatRoleLabel = (role) => ROLE_LABEL_SHORT_MAP[role] || role;
const GENDER_COLORS = {
  Stallion: '#60a5fa',
  Mare: '#fb7185',
  Gelding: '#a855f7',
  Colt: '#22c55e',
  Filly: '#f97316',
  Foal: '#00e6c7',
  Stud: '#ef4444',
  Male: '#60a5fa',
  Female: '#fb7185',
  Unknown: '#94a3b8',
};
const EXPENSE_DEPARTMENT_MAP = {
  Medicine: 'Stable Ops',
  Treatment: 'Stable Ops',
  Maintenance: 'Ground Ops',
  Miscellaneous: 'Accounts',
};
const tooltipStyle = {
  background: 'var(--dashboard-tooltip-bg)',
  border: '1px solid var(--dashboard-tooltip-border)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--dashboard-tooltip-text)',
  padding: '8px 12px',
};

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
      value: 0,
    };
  });
};

const buildMetricSpark = (items, getItemDate, getItemValue = () => 1, { cumulative = false, fallbackTotal = 0 } = {}) => {
  const buckets = createMonthBuckets();
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

const normalizeSparkData = (values = []) => {
  const raw = values.map((value) => Number(value) || 0);
  const active = raw.filter((value) => value > 0);
  const source = (active.length ? active : raw).slice(-6);
  const count = Math.min(6, Math.max(3, source.length || 0));
  const padded = Array.from({ length: count }, (_, index) => {
    const offset = count - source.length;
    return index < offset ? 0 : source[index - offset] || 0;
  });

  const max = Math.max(...padded, 0);
  let heights = padded.map((value, index) => {
    if (!max) {
      return 34 + index * 11;
    }
    return Math.max(Math.round((value / max) * 100), 30 + index * 8);
  });

  heights = heights.reduce((acc, height, index) => {
    const previous = index ? acc[index - 1] : 0;
    const nextHeight = index === 0
      ? Math.max(height, 34)
      : Math.min(Math.max(height, previous + 8), previous + 14);
    acc.push(Math.min(nextHeight, 100));
    return acc;
  }, []);

  return heights;
};

const useCounterAnimation = (targetValue, duration = 900) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof targetValue !== 'number') {
      setDisplayValue(0);
      return;
    }
    if (targetValue === 0) {
      setDisplayValue(0);
      return;
    }

    const startTime = Date.now();
    let frameId;

    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      setDisplayValue(Math.floor(targetValue * progress));
      if (progress < 1) frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [targetValue, duration]);

  return displayValue;
};

const RandomLetterReveal = ({ text }) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (!text) return undefined;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const letters = text.split('');
    let iteration = 0;

    const interval = window.setInterval(() => {
      const scrambled = letters.map((char, index) => {
        if (char === ' ') return ' ';
        if (index < iteration) return char;
        if (index === Math.floor(iteration)) {
          return characters[Math.floor(Math.random() * characters.length)];
        }
        return ' ';
      }).join('');

      setDisplayText(scrambled);

      if (iteration >= letters.length) {
        window.clearInterval(interval);
        setDisplayText(text);
      }

      iteration += 1;
    }, 18);

    return () => window.clearInterval(interval);
  }, [text]);

  return <span>{displayText || text}</span>;
};

const MetricCard = ({
  title,
  value,
  icon: Icon,
  watermarkIcon: WatermarkIcon = HorseIcon,
  iconTone = 'primary',
  variant = 'default',
  sparkData = []
}) => {
  const animatedValue = useCounterAnimation(typeof value === 'number' ? value : 0, 1000);
  const displayValue = typeof value === 'number' ? animatedValue : value;
  const normalizedSpark = normalizeSparkData(sparkData);
  return (
    <div className={`dashboard-lovable-card dashboard-lovable-card--${variant}`}>
      <div className="dashboard-lovable-card-watermark">
        <WatermarkIcon />
      </div>
      <div className="dashboard-lovable-card-head">
        <span className="dashboard-lovable-card-title">{title}</span>
        <div className={`dashboard-lovable-card-icon dashboard-lovable-card-icon--${iconTone}`}>
          {Icon === HorseIcon || Icon === EmployeeFaceIcon ? <Icon className="dashboard-lovable-card-icon-svg" /> : <Icon size={18} strokeWidth={2} />}
        </div>
      </div>
      <div className="dashboard-lovable-card-body">
        <div className="dashboard-lovable-card-value">{displayValue}</div>
        {normalizedSpark.some((entry) => entry > 0) && (
          <div className="dashboard-lovable-card-footer">
            {normalizedSpark.some((entry) => entry > 0) && (
              <div className="dashboard-lovable-card-spark" aria-hidden="true">
                {normalizedSpark.map((entry, index) => (
                  <span key={index} style={{ height: `${entry}%` }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ChartPanel = ({ title, children }) => (
  <div className="dashboard-lovable-panel">
    <h3 className="dashboard-lovable-panel-title">{title}</h3>
    {children}
  </div>
);

const EmptyState = ({ label }) => (
  <div className="dashboard-lovable-empty">{label}</div>
);

const RoleTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0]?.payload;
  if (!item) {
    return null;
  }

  return (
    <div style={tooltipStyle}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatRoleLabel(item.role)}</div>
      <div style={{ color: item.fill, fontWeight: 800 }}>
        Count: {item.count}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [metrics, setMetrics] = useState({
    totalHorses: 0,
    totalStaff: 0,
    pendingTasks: 0,
    auditLogs: 0,
  });
  const [metricSparks, setMetricSparks] = useState({
    horses: [],
    staff: [],
    tasks: [],
    audit: [],
  });
  const [teamByDepartment, setTeamByDepartment] = useState([]);
  const [teamByRole, setTeamByRole] = useState([]);
  const [horsesByGender, setHorsesByGender] = useState([]);
  const [transactionsByDepartment, setTransactionsByDepartment] = useState([]);
  const [clock, setClock] = useState('');

  const locale = DATE_LOCALES[lang] || 'en-US';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [locale]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [tasksRes, horsesRes, employeesRes, logsRes, expensesRes] = await Promise.allSettled([
          apiClient.get('/tasks'),
          apiClient.get('/horses'),
          apiClient.get('/employees'),
          apiClient.get('/audit-logs'),
          apiClient.get('/expenses', { params: { limit: 1000 } }),
        ]);

        let totalHorses = 0;
        let totalStaff = 0;
        let pendingTasks = 0;
        let auditLogs = 0;

        if (tasksRes.status === 'fulfilled') {
          const tasks = tasksRes.value.data.data || tasksRes.value.data || [];
          pendingTasks = tasks.filter((task) => ['Pending', 'Pending Review', 'In Progress'].includes(task.status)).length;
          setMetricSparks((prev) => ({
            ...prev,
            tasks: buildMetricSpark(
              tasks,
              (task) => getDateValue(task.createdAt, task.updatedAt, task.scheduledDatetime, task.scheduledDate),
              (task) => (['Pending', 'Pending Review', 'In Progress'].includes(task.status) ? 1 : 0),
              { fallbackTotal: pendingTasks }
            ),
          }));
        }

        if (horsesRes.status === 'fulfilled') {
          const horses = horsesRes.value.data.data || horsesRes.value.data || [];
          totalHorses = Array.isArray(horses) ? horses.length : 0;

          const genderCount = {};
          horses.forEach((horse) => {
            const key = horse.gender || 'Unknown';
            genderCount[key] = (genderCount[key] || 0) + 1;
          });

          setHorsesByGender(
            Object.entries(genderCount)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value], index) => ({
                name,
                value,
                fill: GENDER_COLORS[name] || CHART_COLORS[index % CHART_COLORS.length],
              }))
          );
          setMetricSparks((prev) => ({
            ...prev,
            horses: buildMetricSpark(
              horses,
              (horse) => getDateValue(horse.createdAt, horse.updatedAt, horse.dateOfBirth),
              () => 1,
              { cumulative: true, fallbackTotal: totalHorses }
            ),
          }));
        }

        if (employeesRes.status === 'fulfilled') {
          const employees = employeesRes.value.data.data || employeesRes.value.data || [];
          totalStaff = Array.isArray(employees) ? employees.length : 0;

          const roleCount = {};
          const departmentCount = {};
          employees.forEach((employee, index) => {
            const role = employee.designation || 'Other';
            const department = DEPARTMENT_MAP[role] || 'Other';
            roleCount[role] = (roleCount[role] || 0) + 1;
            departmentCount[department] = (departmentCount[department] || 0) + 1;
          });

          setTeamByRole(
            Object.entries(roleCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([role, count], index) => ({
                role,
                count,
                fill: CHART_COLORS[index % CHART_COLORS.length],
              }))
          );

          const departmentEntries = Object.entries(departmentCount).sort((a, b) => b[1] - a[1]);
          const departmentTotal = departmentEntries.reduce((sum, [, value]) => sum + value, 0);
          setTeamByDepartment(
            departmentEntries.map(([name, value], index) => ({
              name,
              value,
              fill: CHART_COLORS[index % CHART_COLORS.length],
              percent: departmentTotal ? Math.round((value / departmentTotal) * 100) : 0,
            }))
          );

          setMetricSparks((prev) => ({
            ...prev,
            staff: buildMetricSpark(
              employees,
              (employee) => getDateValue(employee.createdAt, employee.updatedAt),
              () => 1,
              { cumulative: true, fallbackTotal: totalStaff }
            ),
          }));
        }

        if (logsRes.status === 'fulfilled') {
          const logs = logsRes.value.data.data || logsRes.value.data || [];
          auditLogs = Array.isArray(logs) ? logs.length : 0;
          setMetricSparks((prev) => ({
            ...prev,
            audit: buildMetricSpark(
              logs,
              (log) => getDateValue(log.createdAt, log.updatedAt, log.timestamp),
              () => 1,
              { fallbackTotal: auditLogs }
            ),
          }));
        }

        if (expensesRes.status === 'fulfilled') {
          const payload = expensesRes.value.data;
          const expenses = payload.expenses || payload.data || payload || [];
          const departmentTotals = {};
          expenses.forEach((expense) => {
            const department = EXPENSE_DEPARTMENT_MAP[expense.type] || 'Leadership';
            departmentTotals[department] = (departmentTotals[department] || 0) + (parseFloat(expense.amount) || 0);
          });
          const transactionEntries = Object.entries(departmentTotals).sort((a, b) => b[1] - a[1]);
          setTransactionsByDepartment(
            transactionEntries.map(([department, value], index) => ({
              department,
              value,
              fill: CHART_COLORS[index % CHART_COLORS.length],
            }))
          );
        }

        setMetrics({ totalHorses, totalStaff, pendingTasks, auditLogs });
      } catch (error) {
        console.error('Error loading dashboard:', error);
      }
    };

    loadDashboard();
  }, []);

  const departmentTotal = useMemo(
    () => teamByDepartment.reduce((sum, item) => sum + item.value, 0),
    [teamByDepartment]
  );
  const horseTotal = useMemo(
    () => horsesByGender.reduce((sum, item) => sum + item.value, 0),
    [horsesByGender]
  );
  const maxTransactionValue = useMemo(
    () => Math.max(...transactionsByDepartment.map((item) => item.value), 0),
    [transactionsByDepartment]
  );

  return (
    <div className="dashboard-page lovable-page-shell dashboard-lovable">
      <div className="dashboard-lovable-hero">
        <h1 className="dashboard-lovable-hero-title">
          <span className="dashboard-lovable-hero-greeting">{`${greeting},`}</span>
          <span className="dashboard-lovable-hero-name">
            <RandomLetterReveal text={user?.fullName || 'User'} />
          </span>
        </h1>
          <p className="dashboard-lovable-hero-meta">
            {dateStr} <span className="dashboard-lovable-meta-sep">-</span> <span className="dashboard-lovable-meta-strong">{clock || '--:--:--'}</span>
            <span className="dashboard-lovable-meta-status">
              <span className="dashboard-lovable-meta-strong">SYSTEM STATUS: OPTIMAL</span>
            </span>
          </p>
        </div>

        <div className="dashboard-lovable-card-grid">
          <MetricCard icon={Package} watermarkIcon={HorseIcon} title="Total Horses" value={metrics.totalHorses} iconTone="primary" sparkData={metricSparks.horses} />
          <MetricCard icon={EmployeeFaceIcon} watermarkIcon={EmployeeFaceIcon} title="Total Staff / Users" value={metrics.totalStaff} iconTone="primary" sparkData={metricSparks.staff} />
          <MetricCard icon={CheckSquare} watermarkIcon={CheckSquare} title="Pending Tasks" value={metrics.pendingTasks} iconTone="success" variant="success" sparkData={metricSparks.tasks} />
          <MetricCard icon={NotebookPen} watermarkIcon={NotebookPen} title="Audit Logs / Issues" value={metrics.auditLogs} iconTone="destructive" variant="alert" sparkData={metricSparks.audit} />
        </div>

        <div className="dashboard-lovable-chart-grid">
          <ChartPanel title="Staff by Department">
            {teamByDepartment.length === 0 ? <EmptyState label={t(t("No department data available"))} /> : (
              <div className="dashboard-lovable-split">
                <div className="dashboard-lovable-donut-wrap">
                <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={180}>
                  <PieChart>
                    <Pie
                      data={teamByDepartment}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      strokeWidth={2}
                      stroke="var(--dashboard-pie-stroke)"
                    >
                      {teamByDepartment.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dashboard-lovable-donut-center">
                  <p>{departmentTotal ? '100%' : '0%'}</p>
                  <span>{t("Allocated")}</span>
                </div>
              </div>
              <div className="dashboard-lovable-progress-list">
                {teamByDepartment.map((item) => (
                  <div key={item.name} className="dashboard-lovable-progress-item">
                    <div className="dashboard-lovable-progress-top">
                      <div className="dashboard-lovable-progress-label">
                        <span className="dashboard-lovable-dot" style={{ background: item.fill }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="dashboard-lovable-progress-value">{item.percent}%</span>
                    </div>
                    <div className="dashboard-lovable-progress-bar">
                      <span style={{ width: `${item.percent}%`, background: item.fill }} />
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}
          </ChartPanel>

          <ChartPanel title="Staff by Role">
            {teamByRole.length === 0 ? <EmptyState label={t(t("No role data available"))} /> : (
              <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={240}>
                <BarChart data={teamByRole} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--lovable-text-soft, var(--dashboard-tooltip-text))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="role" type="category" width={90} tick={{ fontSize: 9, fill: 'var(--lovable-text-soft, var(--dashboard-tooltip-text))' }} tickFormatter={formatRoleLabel} axisLine={false} tickLine={false} />
                  <Tooltip content={<RoleTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {teamByRole.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
      </div>

      <div className="dashboard-lovable-chart-grid">
        <ChartPanel title="Horses by Gender">
          {horsesByGender.length === 0 ? <EmptyState label={t(t("No horse data available"))} /> : (
            <div className="dashboard-lovable-split dashboard-lovable-split--compact">
              <div className="dashboard-lovable-donut-wrap dashboard-lovable-donut-wrap--small">
                <ResponsiveContainer width="100%" height={160} minWidth={0} minHeight={160}>
                  <PieChart>
                    <Pie
                      data={horsesByGender}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={68}
                      strokeWidth={2}
                      stroke="var(--dashboard-pie-stroke)"
                    >
                      {horsesByGender.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-lovable-stat-list">
                {horsesByGender.map((item) => {
                  const percent = horseTotal ? (item.value / horseTotal) * 100 : 0;
                  return (
                    <div key={item.name} className="dashboard-lovable-stat-item">
                      <div className="dashboard-lovable-progress-top">
                        <div className="dashboard-lovable-progress-label">
                          <span className="dashboard-lovable-dot dashboard-lovable-dot--large" style={{ background: item.fill }} />
                          <span>{item.name}s</span>
                        </div>
                        <span className="dashboard-lovable-stat-number" style={{ color: item.fill }}>{item.value}</span>
                      </div>
                      <div className="dashboard-lovable-progress-bar dashboard-lovable-progress-bar--large">
                        <span style={{ width: `${percent}%`, background: item.fill }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartPanel>

        <ChartPanel title="Transactions by Department">
          {transactionsByDepartment.length === 0 ? <EmptyState label={t(t("No transaction data available"))} /> : (
            <div className="dashboard-lovable-transaction-list">
              {transactionsByDepartment.map((item) => {
                const percent = maxTransactionValue ? (item.value / maxTransactionValue) * 100 : 0;
                return (
                  <div key={item.department} className="dashboard-lovable-transaction-item">
                    <div className="dashboard-lovable-progress-top">
                      <span className="dashboard-lovable-transaction-label">{item.department}</span>
                      <span className="dashboard-lovable-transaction-value">{RUPEE}{Math.round(item.value).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="dashboard-lovable-progress-bar dashboard-lovable-progress-bar--large">
                      <span style={{ width: `${percent}%`, background: item.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
};

export default DashboardPage;
