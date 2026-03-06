import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import {
  Users, ClipboardList, CheckCircle2,
  Clock, BarChart3, ScrollText, ShieldCheck
} from 'lucide-react';
import { FaHorse } from 'react-icons/fa';

const StatCard = ({ icon: Icon, label, value, sub, accent, to }) => {
  const navigate = useNavigate();
  const isFontAwesome = Icon.name?.includes('Fa') || Icon.$$typeof?.toString().includes('Symbol');
  
  return (
    <div
      className={`dash-stat-card${to ? ' dash-stat-card--link' : ''}`}
      onClick={to ? () => navigate(to) : undefined}
      style={to ? { cursor: 'pointer' } : {}}
    >
      <div className="dash-stat-top">
        <span className="dash-stat-label">{label}</span>
        <span className="dash-stat-icon" style={accent ? { background: accent + '18', color: accent } : {}}>
          {isFontAwesome ? (
            <Icon size={16} />
          ) : (
            <Icon size={16} strokeWidth={1.8} />
          )}
        </span>
      </div>
      <div className="dash-stat-value">{value}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [taskStats, setTaskStats] = useState({ pending: 0, completed: 0, total: 0 });
  const [horsesCount, setHorsesCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [auditLogsCount, setAuditLogsCount] = useState(0);
  const [approvalsCount, setApprovalsCount] = useState(0);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
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
      }
      if (horsesRes.status === 'fulfilled') {
        const horses = horsesRes.value.data.data || horsesRes.value.data || [];
        setHorsesCount(Array.isArray(horses) ? horses.length : 0);
      }
      if (employeesRes.status === 'fulfilled') {
        const employees = employeesRes.value.data.data || employeesRes.value.data || [];
        setEmployeesCount(Array.isArray(employees) ? employees.length : 0);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
    try {
      const logsRes = await apiClient.get('/audit-logs');
      const logs = logsRes.data.data || logsRes.data || [];
      setAuditLogsCount(Array.isArray(logs) ? logs.length : 0);
    } catch {}
  };

  const completionRate = taskStats.total > 0
    ? Math.round((taskStats.completed / taskStats.total) * 100)
    : 0;

  const renderCards = () => {
    const role = user?.designation;
    switch (role) {
      case 'Super Admin':
        return <>
          <StatCard icon={FaHorse}        label="Total Horses"    value={horsesCount}     sub="Registered in system"   accent="#6366f1" to="/horses" />
          <StatCard icon={Users}        label="Total Employees" value={employeesCount}  sub="Active team members"    accent="#0ea5e9" to="/employees" />
          <StatCard icon={Clock}        label="Pending Tasks"   value={taskStats.pending} sub="Awaiting action"      accent="#f59e0b" />
          <StatCard icon={ScrollText}   label="Audit Logs"      value={auditLogsCount}  sub="System events"          accent="#10b981" />
        </>;
      case 'Admin':
        return <>
          <StatCard icon={FaHorse}        label="Total Horses"      value={horsesCount}       sub="Registered in system"  accent="#6366f1" to="/horses" />
          <StatCard icon={Users}        label="Total Employees"   value={employeesCount}    sub="Active team members"   accent="#0ea5e9" to="/employees" />
          <StatCard icon={Clock}        label="Pending Tasks"     value={taskStats.pending} sub="Awaiting action"       accent="#f59e0b" />
          <StatCard icon={ShieldCheck}  label="Approvals Pending" value={approvalsCount}    sub="Need review"           accent="#ef4444" />
        </>;
      case 'Zamindar':
        return <>
          <StatCard icon={ClipboardList} label="My Tasks"          value={taskStats.total}   sub="Total assigned"        accent="#6366f1" />
          <StatCard icon={Clock}         label="Pending Approvals" value={taskStats.pending} sub="In queue"              accent="#f59e0b" />
          <StatCard icon={FaHorse}         label="Active Horses"     value={horsesCount}       sub="Under management"      accent="#10b981" to="/horses" />
          <StatCard icon={Users}         label="Team Members"      value={employeesCount}    sub="In your team"          accent="#0ea5e9" to="/employees" />
        </>;
      case 'Instructor':
        return <>
          <StatCard icon={ClipboardList} label="Training Tasks"    value={taskStats.total}    sub="Assigned to you"      accent="#6366f1" />
          <StatCard icon={FaHorse}         label="Horses in Training" value={horsesCount}       sub="Active horses"        accent="#10b981" to="/horses" />
          <StatCard icon={CheckCircle2}  label="Completed"         value={taskStats.completed} sub="This period"         accent="#0ea5e9" />
        </>;
      case 'Health Advisor':
        return <>
          <StatCard icon={ScrollText}    label="Health Records"    value={horsesCount}        sub="Total horses tracked" accent="#6366f1" to="/horses" />
          <StatCard icon={Clock}         label="Pending Tasks"     value={taskStats.pending}  sub="Need attention"       accent="#f59e0b" />
          <StatCard icon={FaHorse}         label="Total Horses"      value={horsesCount}        sub="In facility"          accent="#10b981" to="/horses" />
        </>;
      case 'Jamedar':
        return <>
          <StatCard icon={ClipboardList} label="Assigned Tasks"    value={taskStats.total}    sub="Total workload"       accent="#6366f1" />
          <StatCard icon={Clock}         label="Pending"           value={taskStats.pending}  sub="Not yet done"         accent="#f59e0b" />
          <StatCard icon={CheckCircle2}  label="Completed"         value={taskStats.completed} sub="Finished tasks"      accent="#10b981" />
          <StatCard icon={BarChart3}     label="Completion Rate"   value={`${completionRate}%`} sub="Overall progress"   accent="#0ea5e9" />
        </>;
      case 'Groomer':
      default:
        return <>
          <StatCard icon={ClipboardList} label="Daily Tasks"       value={taskStats.total}    sub="Assigned today"       accent="#6366f1" />
          <StatCard icon={Clock}         label="Pending"           value={taskStats.pending}  sub="Still to do"          accent="#f59e0b" />
          <StatCard icon={CheckCircle2}  label="Completed"         value={taskStats.completed} sub="Done today"          accent="#10b981" />
          <StatCard icon={BarChart3}     label="Completion Rate"   value={`${completionRate}%`} sub="Your progress"      accent="#0ea5e9" />
        </>;
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <div>
          <p className="dash-greeting">{greeting},</p>
          <h1 className="dash-name">{user?.fullName || 'User'}</h1>
          <p className="dash-role">{user?.designation}</p>
        </div>
        <div className="dash-date">{today}</div>
      </div>
      <div className="dashboard-grid">
        {renderCards()}
      </div>
    </div>
  );
};

export default DashboardPage;
