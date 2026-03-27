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

  const StatusBadge = ({ status }) => {
    const colorMap = {
      'Present': 'bg-success/20 text-success', 'Absent': 'bg-destructive/20 text-destructive', 'Leave': 'bg-warning/20 text-warning', 'WOFF': 'bg-primary/20 text-primary', 'Half Day': 'bg-primary/20 text-primary',
      'Completed': 'bg-success/20 text-success', 'Approved': 'bg-success/20 text-success', 'Pending': 'bg-warning/20 text-warning', 'In Progress': 'bg-primary/20 text-primary',
      'Rejected': 'bg-destructive/20 text-destructive', 'Pending Review': 'bg-primary/20 text-primary',
      'Open': 'bg-warning/20 text-warning', 'Resolved': 'bg-success/20 text-success', 'Dismissed': 'bg-muted-foreground/20 text-muted-foreground',
      'pending': 'bg-warning/20 text-warning', 'approved': 'bg-success/20 text-success', 'rejected': 'bg-destructive/20 text-destructive',
      'Low': 'bg-success/20 text-success', 'Medium': 'bg-warning/20 text-warning', 'High': 'bg-warning/20 text-warning', 'Critical': 'bg-destructive/20 text-destructive',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${colorMap[status] || 'bg-muted-foreground/20 text-muted-foreground'}`}>
        {t(status)}
      </span>
    );
  };

  // Stats shown as KPI cards row
  const StatsTable = ({ stats }) => (
    <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 6)}, 1fr)` }}>
      {stats.map((s, i) => (
        <div key={i} className="bg-surface-container-highest rounded-xl p-4 edge-glow text-center">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{s.label}</p>
          <p className="text-2xl font-bold mt-1 mono-data" style={{ color: s.color }}>{s.value}</p>
        </div>
      ))}
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
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <div className="lovable-header-kicker">
          <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
          <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
          <span>{t('Analytics Module')}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('Reports')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('View and generate system reports')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 flex items-center gap-2" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
            <div className="lovable-command-chip">
              <div className="lovable-command-ring">{activeRecordCount}</div>
              <div className="lovable-command-copy">
                <strong>{tabs.find(tab => tab.id === activeTab)?.label}</strong>
                <span>{t('Active Report View')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('Attendance'), value: attendanceStats.total, sub: t('Records in the selected date range') },
          { label: t('Tasks'), value: taskStats.total, sub: t('Task records available for reporting') },
          { label: t('Expenses'), value: expenseStats.total, sub: t('Expense entries in the selected range') },
          { label: t('Health Logs'), value: healthStats.totalMedicineLogs, sub: t('Medicine logs currently loaded') },
        ].map((m, i) => (
          <div key={i} className="bg-surface-container-highest rounded-xl p-5 edge-glow">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{m.label}</p>
            <p className="text-2xl font-bold mt-1 mono-data text-foreground">{m.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="bg-surface-container-highest rounded-xl p-4 edge-glow flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">{t('From')}:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">{t('To')}:</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="lovable-pill-row">
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
              <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Employee')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Designation')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Status')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Remarks')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(attendanceData).map((r, i) => (
                        <tr key={r.id || i} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                          <td className="px-4 py-3 text-foreground">{formatDate(r.date)}</td>
                          <td className="px-4 py-3 text-foreground">{r.employee?.fullName || '-'}</td>
                          <td className="px-4 py-3 text-foreground">{r.employee?.designation || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          <td className="px-4 py-3 text-muted-foreground">{r.remarks || '-'}</td>
                        </tr>
                      ))}
                      {attendanceData.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('No attendance records found')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
              <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Task')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Assigned To')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Created By')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Priority')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(tasksData).map((task, i) => (
                        <tr key={task.id || i} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                          <td className="px-4 py-3 text-foreground">{formatDate(task.scheduledTime || task.createdAt)}</td>
                          <td className="px-4 py-3 text-foreground font-medium">{task.name}</td>
                          <td className="px-4 py-3 text-foreground">{task.assignedEmployee?.fullName || '-'}</td>
                          <td className="px-4 py-3 text-foreground">{task.createdBy?.fullName || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={task.priority} /></td>
                          <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                        </tr>
                      ))}
                      {tasksData.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('No tasks found')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
              <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Type')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Description')}</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Amount')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Created By')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Horse/Employee')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginate(expensesData).map((exp, i) => (
                        <tr key={exp.id || i} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                          <td className="px-4 py-3 text-foreground">{formatDate(exp.date)}</td>
                          <td className="px-4 py-3"><StatusBadge status={exp.type} /></td>
                          <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{exp.description}</td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground mono-data">INR {parseFloat(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-foreground">{exp.createdBy?.fullName || '-'}</td>
                          <td className="px-4 py-3 text-foreground">{exp.horse?.name || exp.employee?.fullName || '-'}</td>
                        </tr>
                      ))}
                      {expensesData.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('No expenses found')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
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

              <h3 className="text-base font-semibold text-foreground mb-3">{t('Inspection Rounds')}</h3>
              <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Round')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Jamedar')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Location')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Severity')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Status')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Description')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectionsData.slice(0, 30).map((insp, i) => (
                        <tr key={insp.id || i} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                          <td className="px-4 py-3 text-foreground">{formatDate(insp.createdAt)}</td>
                          <td className="px-4 py-3 text-foreground">{t(insp.round)}</td>
                          <td className="px-4 py-3 text-foreground">{insp.jamedar?.fullName || '-'}</td>
                          <td className="px-4 py-3 text-foreground">{insp.location || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={insp.severityLevel} /></td>
                          <td className="px-4 py-3"><StatusBadge status={insp.status} /></td>
                          <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{insp.description}</td>
                        </tr>
                      ))}
                      {inspectionsData.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t('No inspections found')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 className="text-base font-semibold text-foreground mb-3">{t('Medicine Logs')}</h3>
              <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Horse')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Medicine')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Quantity')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Administered By')}</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Approval')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicineLogsData.slice(0, 30).map((log, i) => (
                        <tr key={log.id || i} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                          <td className="px-4 py-3 text-foreground">{formatDateTime(log.timeAdministered || log.createdAt)}</td>
                          <td className="px-4 py-3 text-foreground">{log.horse?.name || '-'}</td>
                          <td className="px-4 py-3 text-foreground font-medium">{log.medicineName}</td>
                          <td className="px-4 py-3 text-foreground">{log.quantity} {log.unit}</td>
                          <td className="px-4 py-3 text-foreground">{log.jamedar?.fullName || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={log.approvalStatus} /></td>
                        </tr>
                      ))}
                      {medicineLogsData.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('No medicine logs found')}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;

