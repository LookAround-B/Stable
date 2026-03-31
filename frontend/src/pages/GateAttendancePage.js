import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import Pagination from '../components/Pagination';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { Navigate } from 'react-router-dom';
import { Download, Plus, X, Users, UserCheck, Clock, DoorOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import DateTimePicker from '../components/shared/DateTimePicker';
import DatePicker from '../components/shared/DatePicker';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';

const GateAttendancePage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('staff');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [staffForm, setStaffForm] = useState({
    employeeId: '',
    entryTime: new Date().toISOString().slice(0, 16),
    exitTime: '',
    shift: 'Morning',
    notes: '',
  });

  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    purpose: '',
    entryTime: new Date().toISOString().slice(0, 16),
    exitTime: '',
    contact: '9999999999',
    notes: '',
    visitorCount: 1,
  });

  const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Night'];

  useEffect(() => {
    loadGateLogs();
    loadEmployees();
  }, []);

  const loadGateLogs = async () => {
    try {
      const response = await apiClient.get('/gate-attendance');
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading gate logs:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!staffForm.employeeId) {
        throw new Error('Please select an employee');
      }

      const selectedEmployee = employees.find((e) => e.id === staffForm.employeeId);
      
      const payload = {
        guardId: user?.id,
        personName: selectedEmployee?.fullName,
        personType: 'Staff',
        entryTime: new Date(staffForm.entryTime),
        exitTime: staffForm.exitTime ? new Date(staffForm.exitTime) : null,
        notes: staffForm.notes ? `Shift: ${staffForm.shift}\n${staffForm.notes}` : `Shift: ${staffForm.shift}`,
      };

      const response = await apiClient.post('/gate-attendance', payload);
      
      setMessage('✓ Staff entry logged successfully!');
      setLogs([response.data, ...logs]);
      setShowStaffForm(false);

      setStaffForm({
        employeeId: '',
        entryTime: new Date().toISOString().slice(0, 16),
        exitTime: '',
        shift: 'Morning',
        notes: '',
      });

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage(`✗ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!visitorForm.purpose) {
        throw new Error('Please provide purpose of visit');
      }

      const contactNumber = visitorForm.contact || '9999999999';
      const visitorCount = Math.max(1, parseInt(visitorForm.visitorCount) || 1);

      const promises = [];
      for (let i = 0; i < visitorCount; i++) {
        const visitorLabel = visitorCount > 1
          ? (visitorForm.visitorName ? `${visitorForm.visitorName} (${i + 1}/${visitorCount})` : `Visitor ${i + 1}/${visitorCount}`)
          : (visitorForm.visitorName || 'Unnamed Visitor');

        const payload = {
          guardId: user?.id,
          personName: visitorLabel,
          personType: 'Visitor',
          entryTime: new Date(visitorForm.entryTime),
          exitTime: visitorForm.exitTime ? new Date(visitorForm.exitTime) : null,
          notes: visitorForm.notes ? `Purpose: ${visitorForm.purpose}\nContact: ${contactNumber}\n${visitorForm.notes}` : `Purpose: ${visitorForm.purpose}\nContact: ${contactNumber}`,
        };

        promises.push(apiClient.post('/gate-attendance', payload));
      }

      const responses = await Promise.all(promises);
      
      setMessage(`✓ ${visitorCount} visitor${visitorCount > 1 ? 's' : ''} logged successfully!`);
      setLogs([...responses.map(r => r.data), ...logs]);
      setShowVisitorForm(false);

      setVisitorForm({
        visitorName: '',
        purpose: '',
        entryTime: new Date().toISOString().slice(0, 16),
        exitTime: '',
        contact: '9999999999',
        notes: '',
        visitorCount: 1,
      });

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage(`✗ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const staffLogs = logs.filter((log) => log.personType === 'Staff');
  const visitorLogs = logs.filter((log) => log.personType === 'Visitor');
  const tabLogs = activeTab === 'staff' ? staffLogs : visitorLogs;
  
  const displayLogs = tabLogs.filter((log) => {
    if (!filterFromDate && !filterToDate) return true;
    const logDate = new Date(log.entryTime).toISOString().split('T')[0];
    if (filterFromDate && logDate < filterFromDate) return false;
    if (filterToDate && logDate > filterToDate) return false;
    return true;
  });
  const totalPages = Math.ceil(displayLogs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLogs = displayLogs.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterFromDate, filterToDate, logs.length]);

  const getExportRows = () => {
    if (activeTab === 'staff') {
      return displayLogs.map((log) => ({ 'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '', 'Employee Name': log.personName || '-', 'Designation': log.designation || '-', 'Entry Time': formatTime(log.entryTime), 'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited', 'Shift': log.shift || '-', 'Notes': log.notes || '' }));
    }
    return displayLogs.map((log) => ({ 'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '', 'Visitor Name': log.personName || '-', 'Purpose': log.purpose || '-', 'Entry Time': formatTime(log.entryTime), 'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited', 'Contact': log.contact || '-', 'Notes': log.notes || '' }));
  };

  const handleDownloadExcel = () => {
    const excelData = getExportRows();
    if (excelData.length === 0) { showNoExportDataToast(`No ${activeTab} logs to download`); return; }
    const fileName = activeTab === 'staff'
      ? `StaffGateAttendance_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `VisitorLog_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const sheetName = activeTab === 'staff' ? 'Staff Entry/Exit' : 'Visitor Log';
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };

  const handleDownloadCSV = () => {
    const data = getExportRows();
    if (data.length === 0) { showNoExportDataToast(`No ${activeTab} logs to download`); return; }
    const fileName = activeTab === 'staff'
      ? `StaffGateAttendance_${new Date().toISOString().slice(0, 10)}.csv`
      : `VisitorLog_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(data, fileName);
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";

  if (!p.viewGateEntry) return <Navigate to="/dashboard" replace />;

  return (
    <div className="gate-attendance-page space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Gate')} <span className="text-primary">Attendance</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Log staff entry/exit and visitor visits</p>
        </div>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('✗') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        {[
          { label: 'TOTAL LOGS', value: logs.length, icon: Clock, sub: 'Recorded gate events' },
          { label: 'STAFF ENTRIES', value: staffLogs.length, icon: UserCheck, sub: 'Staff movement logs' },
          { label: 'VISITORS', value: visitorLogs.length, icon: Users, sub: 'Visitor access records' },
          { label: 'CURRENTLY IN', value: logs.filter(l => !l.exitTime).length, icon: DoorOpen, sub: 'Open gate sessions' },
        ].map(k => (
          <OperationalMetricCard key={k.label} label={k.label} value={String(k.value).padStart(2, '0')} icon={k.icon} colorClass="text-primary" bgClass="bg-primary/10" sub={k.sub} hideSub />
        ))}
      </div>

      {/* Tabs */}
      <div className="gate-attendance-controls space-y-3">
        <div className="gate-attendance-tab-row grid grid-cols-2 gap-3">
          <button onClick={() => setActiveTab('staff')} className={`gate-attendance-tab-btn px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 justify-center ${activeTab === 'staff' ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
            <UserCheck className="w-4 h-4 shrink-0" /> Staff Entry/Exit
          </button>
          <button onClick={() => setActiveTab('visitor')} className={`gate-attendance-tab-btn px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-2 justify-center ${activeTab === 'visitor' ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
            <Users className="w-4 h-4 shrink-0" /> Visitor Log
          </button>
        </div>
        <div className="gate-attendance-action-row grid grid-cols-2 gap-3">
          <button onClick={() => activeTab === 'staff' ? setShowStaffForm(!showStaffForm) : setShowVisitorForm(!showVisitorForm)} disabled={!p.createGateEntry} title={!p.createGateEntry ? 'You do not have permission to log entries' : ''} className={`gate-attendance-action-btn h-10 px-3 py-2 sm:px-5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 ${!p.createGateEntry ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' : 'bg-primary text-primary-foreground hover:brightness-110'}`}>
            {(activeTab === 'staff' && showStaffForm) || (activeTab === 'visitor' && showVisitorForm) ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> {activeTab === 'staff' ? 'Log Staff Entry/Exit' : 'Log Visitor'}</>}
          </button>
          <ExportDialog
            title="Export Gate Attendance"
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button title="Export gate attendance" className="gate-attendance-export h-10 w-10 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center shrink-0 ml-auto" type="button" aria-label="Export gate attendance">
                <Download className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            )}
          />
        </div>
      </div>

      {/* ═══ STAFF TAB ═══ */}
      {activeTab === 'staff' && (
        <div className="space-y-5">

          {showStaffForm && (
            <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
              <h3 className="text-lg font-bold text-foreground mb-4">Log Staff Entry/Exit</h3>
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Employee *</label>
                    <SearchableSelect id="employeeId" value={staffForm.employeeId} onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })} placeholder="-- Select Employee --" required disabled={loading} options={[{ value: '', label: '-- Select Employee --' }, ...employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (${t(emp.designation)})` }))]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Entry Time *</label>
                    <DateTimePicker value={staffForm.entryTime} onChange={(val) => setStaffForm({ ...staffForm, entryTime: val })} required disabled={loading} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Exit Time</label>
                    <DateTimePicker value={staffForm.exitTime} onChange={(val) => setStaffForm({ ...staffForm, exitTime: val })} disabled={loading} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Shift *</label>
                    <SearchableSelect value={staffForm.shift} onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })} required disabled={loading} options={SHIFTS.map(s => ({ value: s, label: s }))} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
                    <input type="text" value={staffForm.notes} onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })} disabled={loading} placeholder="Any additional notes" className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="h-10 px-6 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">{loading ? 'Logging...' : 'Log Entry'}</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ═══ VISITOR TAB ═══ */}
      {activeTab === 'visitor' && (
        <div className="space-y-5">

          {showVisitorForm && (
            <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
              <h3 className="text-lg font-bold text-foreground mb-4">Log Visitor</h3>
              <form onSubmit={handleVisitorSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Visitor Name</label>
                    <input type="text" value={visitorForm.visitorName} onChange={(e) => setVisitorForm({ ...visitorForm, visitorName: e.target.value })} disabled={loading} placeholder="Full name (optional)" maxLength="100" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Number of Visitors *</label>
                    <input type="number" min="1" max="50" value={visitorForm.visitorCount} onChange={(e) => setVisitorForm({ ...visitorForm, visitorCount: e.target.value })} required disabled={loading} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Purpose *</label>
                    <input type="text" value={visitorForm.purpose} onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })} required disabled={loading} placeholder="e.g., Veterinary Checkup" maxLength="150" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Contact *</label>
                    <input type="tel" value={visitorForm.contact} onChange={(e) => setVisitorForm({ ...visitorForm, contact: e.target.value })} required disabled={loading} placeholder="Phone" maxLength="20" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Entry Time *</label>
                    <DateTimePicker value={visitorForm.entryTime} onChange={(val) => setVisitorForm({ ...visitorForm, entryTime: val })} required disabled={loading} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Exit Time</label>
                    <DateTimePicker value={visitorForm.exitTime} onChange={(val) => setVisitorForm({ ...visitorForm, exitTime: val })} disabled={loading} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
                    <input type="text" value={visitorForm.notes} onChange={(e) => setVisitorForm({ ...visitorForm, notes: e.target.value })} disabled={loading} placeholder="Additional notes" maxLength="250" className={inputCls} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="h-10 px-6 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">{loading ? 'Logging...' : 'Log Visitor'}</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">{activeTab === 'staff' ? 'Staff Entry/Exit Logs' : 'Visitor Logs'} ({displayLogs.length})</h3>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker value={filterFromDate} onChange={(val) => { setFilterFromDate(val); setCurrentPage(1); }} placeholder="From" />
            <span className="text-xs text-muted-foreground">to</span>
            <DatePicker value={filterToDate} onChange={(val) => { setFilterToDate(val); setCurrentPage(1); }} placeholder="To" />
          </div>
        </div>
        {displayLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {activeTab === 'staff' ? (
                      <>
                        {['Employee', 'Entry Time', 'Exit Time', 'Shift', 'Duration', 'Notes'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </>
                    ) : (
                      <>
                        {['Visitor', 'Purpose', 'Entry Time', 'Exit Time', 'Contact', 'Notes'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-surface-container-high transition-colors">
                      {activeTab === 'staff' ? (
                        <>
                          <td className="px-3 py-3 font-medium text-foreground">{log.personName}</td>
                          <td className="px-3 py-3 text-muted-foreground mono-data whitespace-nowrap">{formatTime(log.entryTime)}</td>
                          <td className="px-3 py-3 mono-data whitespace-nowrap">{log.exitTime ? <span className="text-muted-foreground">{formatTime(log.exitTime)}</span> : <span className="text-success text-xs font-semibold">IN</span>}</td>
                          <td className="px-3 py-3 text-muted-foreground">{log.notes ? (log.notes.includes('Shift:') ? log.notes.split('\n')[0].replace('Shift: ', '') : '—') : '—'}</td>
                          <td className="px-3 py-3 text-muted-foreground mono-data">{log.exitTime ? `${Math.round((new Date(log.exitTime) - new Date(log.entryTime)) / 60000)} min` : '—'}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{log.notes ? log.notes.split('\n').slice(1).join(' ').trim() || '—' : '—'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-3 font-medium text-foreground">{log.personName}</td>
                          <td className="px-3 py-3 text-muted-foreground">{log.notes ? (log.notes.split('\n').find((line) => line.includes('Purpose:'))?.replace('Purpose: ', '') || '—') : '—'}</td>
                          <td className="px-3 py-3 text-muted-foreground mono-data whitespace-nowrap">{formatTime(log.entryTime)}</td>
                          <td className="px-3 py-3 mono-data whitespace-nowrap">{log.exitTime ? <span className="text-muted-foreground">{formatTime(log.exitTime)}</span> : <span className="text-success text-xs font-semibold">IN</span>}</td>
                          <td className="px-3 py-3 text-muted-foreground mono-data">{log.notes ? (log.notes.split('\n').find((line) => line.includes('Contact:'))?.replace('Contact: ', '') || '—') : '—'}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{log.notes ? log.notes.split('\n').slice(2).join(' ').trim() || '—' : '—'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
              total={displayLogs.length}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default GateAttendancePage;
