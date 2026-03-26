import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { Navigate } from 'react-router-dom';
import { Download, Plus, X, Users, UserCheck, Clock, DoorOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

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
  const displayLogs = activeTab === 'staff' ? staffLogs : visitorLogs;

  const handleDownloadExcel = () => {
    if (displayLogs.length === 0) { alert(`No ${activeTab} logs to download`); return; }
    let excelData, fileName, sheetName;
    if (activeTab === 'staff') {
      excelData = displayLogs.map((log) => ({ 'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '', 'Employee Name': log.personName || '-', 'Designation': log.designation || '-', 'Entry Time': formatTime(log.entryTime), 'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited', 'Shift': log.shift || '-', 'Notes': log.notes || '' }));
      fileName = `StaffGateAttendance_${new Date().toISOString().slice(0, 10)}.xlsx`; sheetName = 'Staff Entry/Exit';
    } else {
      excelData = displayLogs.map((log) => ({ 'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '', 'Visitor Name': log.personName || '-', 'Purpose': log.purpose || '-', 'Entry Time': formatTime(log.entryTime), 'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited', 'Contact': log.contact || '-', 'Notes': log.notes || '' }));
      fileName = `VisitorLog_${new Date().toISOString().slice(0, 10)}.xlsx`; sheetName = 'Visitor Log';
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };

  const handleDownloadCSV = () => {
    if (displayLogs.length === 0) { alert(`No ${activeTab} logs to download`); return; }
    let csvData, fileName;
    if (activeTab === 'staff') {
      csvData = displayLogs.map((log) => ({ 'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '', 'Employee Name': log.personName || '-', 'Designation': log.designation || '-', 'Entry Time': formatTime(log.entryTime), 'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited', 'Shift': log.shift || '-', 'Notes': log.notes || '' }));
      fileName = `StaffGateAttendance_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      csvData = displayLogs.map((log) => ({ 'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '', 'Visitor Name': log.personName || '-', 'Purpose': log.purpose || '-', 'Entry Time': formatTime(log.entryTime), 'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited', 'Contact': log.contact || '-', 'Notes': log.notes || '' }));
      fileName = `VisitorLog_${new Date().toISOString().slice(0, 10)}.csv`;
    }
    const headers = Object.keys(csvData[0]);
    const escape = (val) => { const s = String(val ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [headers.map(escape).join(','), ...csvData.map(row => headers.map(h => escape(row[h])).join(','))];
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const inputCls = "w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";

  if (!p.viewGateEntry) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"><DoorOpen className="w-7 h-7 inline-block mr-2 text-primary" />{t('Gate')} <span className="text-primary">Attendance</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Log staff entry/exit and visitor visits</p>
        </div>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('✗') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Logs', value: logs.length, icon: Clock },
          { label: 'Staff Entries', value: staffLogs.length, icon: UserCheck },
          { label: 'Visitors', value: visitorLogs.length, icon: Users },
          { label: 'Currently In', value: logs.filter(l => !l.exitTime).length, icon: DoorOpen },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{k.label}</p>
              <k.icon className="w-4 h-4 text-primary/60" />
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mono-data">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        <button onClick={() => setActiveTab('staff')} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'staff' ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
          <UserCheck className="w-4 h-4" /> Staff Entry/Exit
        </button>
        <button onClick={() => setActiveTab('visitor')} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'visitor' ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
          <Users className="w-4 h-4" /> Visitor Log
        </button>
      </div>

      {/* ═══ STAFF TAB ═══ */}
      {activeTab === 'staff' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowStaffForm(!showStaffForm)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
              {showStaffForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Log Staff Entry/Exit</>}
            </button>
            <button onClick={handleDownloadExcel} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" />Excel</button>
            <button onClick={handleDownloadCSV} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" />CSV</button>
          </div>

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
                    <input type="datetime-local" value={staffForm.entryTime} onChange={(e) => setStaffForm({ ...staffForm, entryTime: e.target.value })} required disabled={loading} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Exit Time</label>
                    <input type="datetime-local" value={staffForm.exitTime} onChange={(e) => setStaffForm({ ...staffForm, exitTime: e.target.value })} disabled={loading} className={inputCls} />
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
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowVisitorForm(!showVisitorForm)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
              {showVisitorForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Log Visitor</>}
            </button>
            <button onClick={handleDownloadExcel} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" />Excel</button>
            <button onClick={handleDownloadCSV} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" />CSV</button>
          </div>

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
                    <input type="datetime-local" value={visitorForm.entryTime} onChange={(e) => setVisitorForm({ ...visitorForm, entryTime: e.target.value })} required disabled={loading} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Exit Time</label>
                    <input type="datetime-local" value={visitorForm.exitTime} onChange={(e) => setVisitorForm({ ...visitorForm, exitTime: e.target.value })} disabled={loading} className={inputCls} />
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
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">{activeTab === 'staff' ? 'Staff Entry/Exit Logs' : 'Visitor Logs'} ({displayLogs.length})</h3>
        </div>
        {displayLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No logs found</div>
        ) : (
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
                {displayLogs.map((log) => (
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
        )}
      </div>
    </div>
  );
};

export default GateAttendancePage;
