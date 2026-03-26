import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../context/I18nContext';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import { StatsSkeleton, TableSkeleton } from '../components/Skeleton';
import { expenseService } from '../services/expenseService';
import inspectionService from '../services/inspectionService';
import medicineLogService from '../services/medicineLogService';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const ReportsPage = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [attendanceData, setAttendanceData] = useState([]);
  const [tasksData, setTasksData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [inspectionsData, setInspectionsData] = useState([]);
  const [medicineLogsData, setMedicineLogsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/attendance', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      setAttendanceData(Array.isArray(res.data) ? res.data : res.data?.attendance || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/tasks', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      const data = response.data;
      setTasksData(Array.isArray(data) ? data : data?.tasks || data?.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasksData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await expenseService.getAllExpenses({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: '1000',
      });
      setExpensesData(data?.expenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpensesData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const [inspRes, medRes] = await Promise.all([
        inspectionService.getAllInspections({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
        medicineLogService.getMedicineLogs({
          fromDate: dateRange.startDate,
          toDate: dateRange.endDate,
        }),
      ]);
      setInspectionsData(inspRes?.inspections || inspRes?.data || (Array.isArray(inspRes) ? inspRes : []));
      setMedicineLogsData(medRes?.medicineLogs || medRes?.data || (Array.isArray(medRes) ? medRes : []));
    } catch (error) {
      console.error('Error loading health data:', error);
      setInspectionsData([]);
      setMedicineLogsData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === 'attendance') loadAttendance();
    else if (activeTab === 'tasks') loadTasks();
    else if (activeTab === 'expenses') loadExpenses();
    else if (activeTab === 'health') loadHealthData();
  }, [activeTab, dateRange, loadAttendance, loadTasks, loadExpenses, loadHealthData]);

  const attendanceStats = useMemo(() => {
    const total = attendanceData.length;
    const present = attendanceData.filter(a => a.status === 'Present').length;
    const absent = attendanceData.filter(a => a.status === 'Absent').length;
    const leave = attendanceData.filter(a => a.status === 'Leave').length;
    const woff = attendanceData.filter(a => a.status === 'WOFF').length;
    const halfDay = attendanceData.filter(a => a.status === 'Half Day').length;
    return { total, present, absent, leave, woff, halfDay };
  }, [attendanceData]);

  const taskStats = useMemo(() => {
    const total = tasksData.length;
    const completed = tasksData.filter(t => t.status === 'Completed' || t.status === 'Approved').length;
    const pending = tasksData.filter(t => t.status === 'Pending').length;
    const inProgress = tasksData.filter(t => t.status === 'In Progress').length;
    const rejected = tasksData.filter(t => t.status === 'Rejected').length;
    return { total, completed, pending, inProgress, rejected };
  }, [tasksData]);

  const expenseStats = useMemo(() => {
    const total = expensesData.length;
    const totalAmount = expensesData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const byType = {};
    expensesData.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + (parseFloat(e.amount) || 0);
    });
    return { total, totalAmount, byType };
  }, [expensesData]);

  const healthStats = useMemo(() => {
    const totalInspections = inspectionsData.length;
    const openInspections = inspectionsData.filter(i => i.status === 'Open').length;
    const criticalInspections = inspectionsData.filter(i => i.severityLevel === 'Critical' || i.severityLevel === 'High').length;
    const totalMedicineLogs = medicineLogsData.length;
    const pendingApprovals = medicineLogsData.filter(m => m.approvalStatus === 'pending').length;
    return { totalInspections, openInspections, criticalInspections, totalMedicineLogs, pendingApprovals };
  }, [inspectionsData, medicineLogsData]);

  const paginate = (data) => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return data.slice(startIndex, startIndex + rowsPerPage);
  };

  const getTotalPages = (data) => Math.ceil(data.length / rowsPerPage);
  const activeRecordCount = activeTab === 'attendance'
    ? attendanceStats.total
    : activeTab === 'tasks'
      ? taskStats.total
      : activeTab === 'expenses'
        ? expenseStats.total
        : healthStats.totalInspections + healthStats.totalMedicineLogs;

  const getStatusColor = (status) => {
    const colors = {
      'Present': '#22c55e', 'Absent': '#ef4444', 'Leave': '#f59e0b', 'WOFF': '#8b5cf6', 'Half Day': '#d19bff',
      'Completed': '#22c55e', 'Approved': '#22c55e', 'Pending': '#f59e0b', 'In Progress': '#d19bff',
      'Rejected': '#ef4444', 'Pending Review': '#8b5cf6',
      'Open': '#f59e0b', 'Resolved': '#22c55e', 'Dismissed': '#6b7280',
      'pending': '#f59e0b', 'approved': '#22c55e', 'rejected': '#ef4444',
      'Low': '#22c55e', 'Medium': '#f59e0b', 'High': '#f97316', 'Critical': '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    borderBottom: '1px solid var(--lovable-line)',
    fontWeight: 600,
    background: 'var(--lovable-panel-alt)',
    color: 'var(--lovable-text-muted)'
  };
  const tdStyle = {
    padding: '8px 12px',
    color: 'var(--lovable-text)',
    background: 'transparent'
  };
  const tableShellStyle = {
    borderRadius: '18px',
    overflow: 'hidden',
    border: '1px solid var(--lovable-line)',
    background: 'var(--lovable-panel)',
    boxShadow: 'inset 0 0 0 1px rgba(209, 153, 255, 0.03)',
  };
  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
    background: 'transparent',
    color: 'var(--lovable-text)',
  };
  const tableRowStyle = { borderBottom: '1px solid var(--lovable-line)' };
  const emptyStateStyle = { padding: '20px', textAlign: 'center', color: 'var(--lovable-text-muted)' };

  const StatusBadge = ({ status }) => (
    <span style={{
      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
      backgroundColor: `${getStatusColor(status)}22`, color: getStatusColor(status),
    }}>
      {t(status)}
    </span>
  );

  // Stats shown as a compact horizontal table
  const StatsTable = ({ stats }) => (
    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--lovable-line)', marginBottom: '20px', background: 'var(--lovable-panel)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ background: 'var(--lovable-panel-alt)' }}>
            {stats.map((s, i) => (
              <th key={i} style={{ padding: '8px 14px', fontWeight: 600, color: 'var(--lovable-text-muted)', textAlign: 'center', borderRight: i < stats.length - 1 ? '1px solid var(--lovable-line)' : 'none', whiteSpace: 'nowrap' }}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: 'transparent' }}>
            {stats.map((s, i) => (
              <td key={i} style={{ padding: '10px 14px', textAlign: 'center', borderRight: i < stats.length - 1 ? '1px solid var(--lovable-line)' : 'none' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderPagination = (data) => {
    const pages = getTotalPages(data);
    return (
      <Pagination
        currentPage={currentPage}
        totalPages={pages}
        onPageChange={setCurrentPage}
        rowsPerPage={rowsPerPage}
        total={data.length}
      />
    );
  };

  const tabs = [
    { id: 'attendance', label: t('Attendance Reports') },
    { id: 'tasks', label: t('Task Reports') },
    { id: 'expenses', label: t('Expense Reports') },
    { id: 'health', label: t('Horse Health Reports') },
  ];

  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split('T')[0];
    if (activeTab === 'attendance') {
      const data = attendanceData.map(r => ({
        'Date': formatDate(r.date),
        'Employee': r.employee?.fullName || '-',
        'Designation': r.employee?.designation || '-',
        'Status': r.status || '-',
        'Remarks': r.remarks || '-',
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Attendance');
      XLSX.writeFile(workbook, `Attendance_Report_${dateStr}.xlsx`);
    } else if (activeTab === 'tasks') {
      const data = tasksData.map(task => ({
        'Date': formatDate(task.scheduledTime || task.createdAt),
        'Task': task.name || '-',
        'Assigned To': task.assignedEmployee?.fullName || '-',
        'Created By': task.createdBy?.fullName || '-',
        'Priority': task.priority || '-',
        'Status': task.status || '-',
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Tasks');
      XLSX.writeFile(workbook, `Tasks_Report_${dateStr}.xlsx`);
    } else if (activeTab === 'expenses') {
      const data = expensesData.map(exp => ({
        'Date': formatDate(exp.date),
        'Type': exp.type || '-',
        'Description': exp.description || '-',
        'Amount (INR)': parseFloat(exp.amount || 0).toFixed(2),
        'Created By': exp.createdBy?.fullName || '-',
        'Horse/Employee': exp.horse?.name || exp.employee?.fullName || '-',
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Expenses');
      XLSX.writeFile(workbook, `Expenses_Report_${dateStr}.xlsx`);
    } else if (activeTab === 'health') {
      const inspData = inspectionsData.map(insp => ({
        'Date': formatDate(insp.createdAt),
        'Round': insp.round || '-',
        'Jamedar': insp.jamedar?.fullName || '-',
        'Location': insp.location || '-',
        'Severity': insp.severityLevel || '-',
        'Status': insp.status || '-',
        'Description': insp.description || '-',
      }));
      const medData = medicineLogsData.map(log => ({
        'Date/Time': formatDateTime(log.timeAdministered || log.createdAt),
        'Horse': log.horse?.name || '-',
        'Medicine': log.medicineName || '-',
        'Quantity': `${log.quantity} ${log.unit}`,
        'Administered By': log.jamedar?.fullName || '-',
        'Approval Status': log.approvalStatus || '-',
      }));
      if (inspData.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inspData), 'Inspections');
      if (medData.length > 0) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(medData), 'Medicine Logs');
      if (inspData.length === 0 && medData.length === 0) return;
      XLSX.writeFile(workbook, `Health_Report_${dateStr}.xlsx`);
    }
  };

  return (
    <div className="page-container lovable-page-shell reports-page" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="lovable-header-kicker">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>{t('Analytics Module')}</span>
          </div>
          <h1>{t('Reports')}</h1>
          <p>{t('View and generate system reports')}</p>
        </div>
        <div className="lovable-header-actions">
          <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
          <div className="lovable-command-chip">
            <div className="lovable-command-ring">{activeRecordCount}</div>
            <div className="lovable-command-copy">
              <strong>{tabs.find(tab => tab.id === activeTab)?.label}</strong>
              <span>{t('Active Report View')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lovable-metric-strip">
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Attendance')}</div>
          <div className="lovable-metric-card-value">{attendanceStats.total}</div>
          <div className="lovable-metric-card-sub">{t('Records in the selected date range')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Tasks')}</div>
          <div className="lovable-metric-card-value">{taskStats.total}</div>
          <div className="lovable-metric-card-sub">{t('Task records available for reporting')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Expenses')}</div>
          <div className="lovable-metric-card-value">{expenseStats.total}</div>
          <div className="lovable-metric-card-sub">{t('Expense entries in the selected range')}</div>
        </div>
        <div className="lovable-metric-card">
          <div className="lovable-metric-card-label">{t('Health Logs')}</div>
          <div className="lovable-metric-card-value">{healthStats.totalMedicineLogs}</div>
          <div className="lovable-metric-card-sub">{t('Medicine logs currently loaded')}</div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="lovable-panel" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--lovable-text-muted)' }}>{t('From')}:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--lovable-line)', fontSize: '0.875rem', background: 'var(--bg-input)', color: 'var(--lovable-text)' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--lovable-text-muted)' }}>{t('To')}:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--lovable-line)', fontSize: '0.875rem', background: 'var(--bg-input)', color: 'var(--lovable-text)' }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="lovable-pill-row" style={{ marginBottom: '20px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`lovable-pill ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div><StatsSkeleton count={4} /><TableSkeleton cols={5} rows={6} /></div>
      ) : (
        <>
          {/* ====== ATTENDANCE ====== */}
          {activeTab === 'attendance' && (
            <div>
              <StatsTable stats={[
                { label: t('Total Records'), value: attendanceStats.total, color: '#6366f1' },
                { label: t('Present'), value: attendanceStats.present, color: '#22c55e' },
                { label: t('Absent'), value: attendanceStats.absent, color: '#ef4444' },
                { label: t('Leave'), value: attendanceStats.leave, color: '#f59e0b' },
                { label: t('Weekly Off'), value: attendanceStats.woff, color: '#8b5cf6' },
                { label: t('Half Day'), value: attendanceStats.halfDay, color: '#d19bff' },
              ]} />
              <div className="table-wrapper" style={tableShellStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('Date')}</th>
                      <th style={thStyle}>{t('Employee')}</th>
                      <th style={thStyle}>{t('Designation')}</th>
                      <th style={thStyle}>{t('Status')}</th>
                      <th style={thStyle}>{t('Remarks')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(attendanceData).map((r, i) => (
                      <tr key={r.id || i} style={tableRowStyle}>
                        <td style={tdStyle}>{formatDate(r.date)}</td>
                        <td style={tdStyle}>{r.employee?.fullName || '-'}</td>
                        <td style={tdStyle}>{r.employee?.designation || '-'}</td>
                        <td style={tdStyle}><StatusBadge status={r.status} /></td>
                        <td style={{ ...tdStyle, color: 'var(--lovable-text-muted)' }}>{r.remarks || '-'}</td>
                      </tr>
                    ))}
                    {attendanceData.length === 0 && (
                      <tr><td colSpan={5} style={emptyStateStyle}>{t('No attendance records found')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(attendanceData)}
            </div>
          )}

          {/* ====== TASKS ====== */}
          {activeTab === 'tasks' && (
            <div>
              <StatsTable stats={[
                { label: t('Total Tasks'), value: taskStats.total, color: '#6366f1' },
                { label: t('Completed'), value: taskStats.completed, color: '#22c55e' },
                { label: t('Pending'), value: taskStats.pending, color: '#f59e0b' },
                { label: t('In Progress'), value: taskStats.inProgress, color: '#d19bff' },
                { label: t('Rejected'), value: taskStats.rejected, color: '#ef4444' },
              ]} />
              <div className="table-wrapper" style={tableShellStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('Date')}</th>
                      <th style={thStyle}>{t('Task')}</th>
                      <th style={thStyle}>{t('Assigned To')}</th>
                      <th style={thStyle}>{t('Created By')}</th>
                      <th style={thStyle}>{t('Priority')}</th>
                      <th style={thStyle}>{t('Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(tasksData).map((task, i) => (
                      <tr key={task.id || i} style={tableRowStyle}>
                        <td style={tdStyle}>{formatDate(task.scheduledTime || task.createdAt)}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{task.name}</td>
                        <td style={tdStyle}>{task.assignedEmployee?.fullName || '-'}</td>
                        <td style={tdStyle}>{task.createdBy?.fullName || '-'}</td>
                        <td style={tdStyle}><StatusBadge status={task.priority} /></td>
                        <td style={tdStyle}><StatusBadge status={task.status} /></td>
                      </tr>
                    ))}
                    {tasksData.length === 0 && (
                      <tr><td colSpan={6} style={emptyStateStyle}>{t('No tasks found')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(tasksData)}
            </div>
          )}

          {/* ====== EXPENSES ====== */}
          {activeTab === 'expenses' && (
            <div>
              <StatsTable stats={[
                { label: t('Total Expenses'), value: expenseStats.total, color: '#6366f1' },
                { label: t('Total Amount'), value: `INR ${expenseStats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#ef4444' },
                ...Object.entries(expenseStats.byType).map(([type, amount]) => ({
                  label: t(type), value: `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#f59e0b',
                })),
              ]} />
              <div className="table-wrapper" style={tableShellStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('Date')}</th>
                      <th style={thStyle}>{t('Type')}</th>
                      <th style={thStyle}>{t('Description')}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{t('Amount')}</th>
                      <th style={thStyle}>{t('Created By')}</th>
                      <th style={thStyle}>{t('Horse/Employee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginate(expensesData).map((exp, i) => (
                      <tr key={exp.id || i} style={tableRowStyle}>
                        <td style={tdStyle}>{formatDate(exp.date)}</td>
                        <td style={tdStyle}><StatusBadge status={exp.type} /></td>
                        <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>INR {parseFloat(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>{exp.createdBy?.fullName || '-'}</td>
                        <td style={tdStyle}>{exp.horse?.name || exp.employee?.fullName || '-'}</td>
                      </tr>
                    ))}
                    {expensesData.length === 0 && (
                      <tr><td colSpan={6} style={emptyStateStyle}>{t('No expenses found')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {renderPagination(expensesData)}
            </div>
          )}

          {/* ====== HORSE HEALTH ====== */}
          {activeTab === 'health' && (
            <div>
              <StatsTable stats={[
                { label: t('Total Inspections'), value: healthStats.totalInspections, color: '#6366f1' },
                { label: t('Open Issues'), value: healthStats.openInspections, color: '#f59e0b' },
                { label: t('Critical/High'), value: healthStats.criticalInspections, color: '#ef4444' },
                { label: t('Medicine Logs'), value: healthStats.totalMedicineLogs, color: '#22c55e' },
                { label: t('Pending Approvals'), value: healthStats.pendingApprovals, color: '#8b5cf6' },
              ]} />

              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--lovable-text)' }}>{t('Inspection Rounds')}</h3>
              <div className="table-wrapper" style={{ ...tableShellStyle, marginBottom: '30px' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('Date')}</th>
                      <th style={thStyle}>{t('Round')}</th>
                      <th style={thStyle}>{t('Jamedar')}</th>
                      <th style={thStyle}>{t('Location')}</th>
                      <th style={thStyle}>{t('Severity')}</th>
                      <th style={thStyle}>{t('Status')}</th>
                      <th style={thStyle}>{t('Description')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionsData.slice(0, 30).map((insp, i) => (
                      <tr key={insp.id || i} style={tableRowStyle}>
                        <td style={tdStyle}>{formatDate(insp.createdAt)}</td>
                        <td style={tdStyle}>{t(insp.round)}</td>
                        <td style={tdStyle}>{insp.jamedar?.fullName || '-'}</td>
                        <td style={tdStyle}>{insp.location || '-'}</td>
                        <td style={tdStyle}><StatusBadge status={insp.severityLevel} /></td>
                        <td style={tdStyle}><StatusBadge status={insp.status} /></td>
                        <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insp.description}</td>
                      </tr>
                    ))}
                    {inspectionsData.length === 0 && (
                      <tr><td colSpan={7} style={emptyStateStyle}>{t('No inspections found')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--lovable-text)' }}>{t('Medicine Logs')}</h3>
              <div className="table-wrapper" style={tableShellStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{t('Date')}</th>
                      <th style={thStyle}>{t('Horse')}</th>
                      <th style={thStyle}>{t('Medicine')}</th>
                      <th style={thStyle}>{t('Quantity')}</th>
                      <th style={thStyle}>{t('Administered By')}</th>
                      <th style={thStyle}>{t('Approval')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicineLogsData.slice(0, 30).map((log, i) => (
                      <tr key={log.id || i} style={tableRowStyle}>
                        <td style={tdStyle}>{formatDateTime(log.timeAdministered || log.createdAt)}</td>
                        <td style={tdStyle}>{log.horse?.name || '-'}</td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{log.medicineName}</td>
                        <td style={tdStyle}>{log.quantity} {log.unit}</td>
                        <td style={tdStyle}>{log.jamedar?.fullName || '-'}</td>
                        <td style={tdStyle}><StatusBadge status={log.approvalStatus} /></td>
                      </tr>
                    ))}
                    {medicineLogsData.length === 0 && (
                      <tr><td colSpan={6} style={emptyStateStyle}>{t('No medicine logs found')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;

