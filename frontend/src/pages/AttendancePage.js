import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import { useI18n } from '../context/I18nContext';
import { Download, Plus, Users, UserCheck, Clock, X, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import DateTimePicker from '../components/shared/DateTimePicker';
import SelectField from '../components/shared/SelectField';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';

const lbl = 'label-sm text-muted-foreground block mb-1.5 uppercase tracking-wider text-[10px] font-semibold';

const StatusBadge = ({ status }) => {
  if (!status) return <span>-</span>;
  let colorClass = 'bg-surface-container-high text-muted-foreground border-border';
  if (status.toLowerCase() === 'present' || status.includes('Approved')) colorClass = 'bg-success/20 text-success border-success/30';
  else if (status.toLowerCase() === 'absent' || status.includes('Error')) colorClass = 'bg-destructive/20 text-destructive border-destructive/30';
  else if (status.toLowerCase().includes('late') || status.includes('Pending')) colorClass = 'bg-warning/20 text-warning border-warning/30';
  
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
      {status}
    </span>
  );
};

const AttendancePage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    employeeId: user?.id || '',
    timeIn: new Date().toISOString().slice(0, 16),
    timeOut: '',
    shift: '',
    notes: '',
  });

  // Shifts for Guards and Electricians
  const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const requiresShift = ['Guard', 'Electrician'].includes(user?.designation);
  const isManager = ['Ground Supervisor', 'Stable Manager', 'Director'].includes(user?.designation);

  useEffect(() => {
    loadAttendanceLogs();
    if (isManager) {
      loadEmployees();
    }
  }, [user?.designation, isManager]);

  const loadAttendanceLogs = async () => {
    try {
      const response = await apiClient.get('/attendance');
      setAttendanceLogs(response.data);
    } catch (error) {
      console.error('Error loading attendance logs:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (requiresShift && !formData.shift) {
        throw new Error('Shift is required for your designation');
      }

      const payload = {
        employeeId: formData.employeeId || user?.id,
        timeIn: new Date(formData.timeIn),
        timeOut: formData.timeOut ? new Date(formData.timeOut) : null,
        shift: formData.shift || null,
        notes: formData.notes || null,
      };

      const response = await apiClient.post('/attendance', payload);
      
      setMessage('✓ Attendance logged successfully!');
      setAttendanceLogs([response.data, ...attendanceLogs]);
      setShowForm(false);
      
      setFormData({
        employeeId: user?.id || '',
        timeIn: new Date().toISOString().slice(0, 16),
        timeOut: '',
        shift: '',
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

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getExportRows = () => attendanceLogs.map(log => ({
      'Date': log.date ? new Date(log.date).toLocaleDateString('en-GB') : (log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-GB') : ''),
      'Employee': log.employee?.fullName || '',
      'Check In': log.checkInTime ? formatTime(log.checkInTime) : '',
      'Check Out': log.checkOutTime ? formatTime(log.checkOutTime) : '',
      'Shift': log.shift || '',
      'Status': log.status || '',
      'Notes': log.notes || '',
    }));

  const handleDownloadExcel = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data to download'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Attendance_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleDownloadCSV = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast('No data to download'); return; }
    downloadCsvFile(data, `Attendance_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const filteredLogs = useMemo(() => {
    return attendanceLogs.filter(log => {
      if (search && !(log.employee?.fullName?.toLowerCase() || '').includes(search.toLowerCase())) return false;
      return true;
    });
  }, [attendanceLogs, search]);

  const presentCount = attendanceLogs.filter(a => a.timeIn && !a.timeOut).length;
  const completedCount = attendanceLogs.filter(a => a.timeOut).length;
  const metricsTotal = attendanceLogs.length || 1;
  const rate = ((presentCount / metricsTotal) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Mark Team Attendance')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isManager ? t('Manage your team attendance') : t('Log your attendance')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportDialog
            title={t("Export Attendance")}
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button className="h-9 w-9 rounded-lg border border-border text-foreground flex items-center justify-center hover:bg-surface-container-high transition-colors" type="button" aria-label={t("Export attendance")} title={t("Export attendance")}>
                <Download className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            )}
          />
          <button onClick={() => setShowForm(!showForm)} className="h-9 px-4 sm:px-5 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showForm ? t('Close form') : t('Mark Attendance')}</span><span className="sm:hidden">{t('Mark')}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium border ${message.includes('✗') ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-success/15 text-success border-success/30'}`}>
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Total Logs')}</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground">{String(attendanceLogs.length).padStart(2, '0')}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Active Sessions')}</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><UserCheck className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground">{rate}<span className="text-lg text-muted-foreground ml-1">%</span></p>
          <div className="mt-2 h-1.5 rounded-full bg-surface-container-high overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} /></div>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Completed')}</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><UserCheck className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-success">{String(completedCount).padStart(2, '0')}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Pending Appr.')}</span>
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="w-4 h-4 text-warning" /></div>
          </div>
          <p className="text-3xl font-bold text-warning">{String(attendanceLogs.filter(a => !a.isApproved).length).padStart(2, '0')}</p>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto bg-background/80 backdrop-blur-sm px-4 pb-4 pt-[72px] sm:p-6" onClick={() => setShowForm(false)}>
          <div className="my-auto flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-container-highest max-h-[calc(100dvh-5.5rem)] sm:max-h-[90vh] edge-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h3 className="text-xl font-bold text-foreground">{t('Log Attendance Form')}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {isManager && (
                  <div className="sm:col-span-2 lg:col-span-3 z-10">
                    <label className={lbl}>{t('Employee')} *</label>
                    <SearchableSelect
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => setFormData(prev => ({...prev, employeeId: e.target.value}))}
                      placeholder="-- Select Employee --"
                      required
                      disabled={loading}
                      options={[
                        { value: '', label: '-- Select Employee --' },
                        ...employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (${t(emp.designation)})` }))
                      ]}
                    />
                  </div>
               )}
               
               <div>
                  <label className={lbl}>{t('Time In')} *</label>
                  <DateTimePicker
                    value={formData.timeIn}
                    onChange={(val) => handleInputChange({ target: { name: 'timeIn', value: val } })}
                    required
                    disabled={loading}
                  />
               </div>

               <div>
                 <label className={lbl}>{t('Time Out')}</label>
                 <DateTimePicker
                   value={formData.timeOut}
                   onChange={(val) => handleInputChange({ target: { name: 'timeOut', value: val } })}
                   disabled={loading}
                 />
               </div>

               {requiresShift && (
                 <div>
                   <label className={lbl}>{t('Shift')} *</label>
                   <SelectField
                     value={formData.shift}
                     onChange={(val) => handleInputChange({ target: { name: 'shift', value: val } })}
                     options={['-- Select Shift --', ...SHIFTS]}
                     disabled={loading}
                   />
                 </div>
               )}

               <div className="sm:col-span-2 lg:col-span-3">
                 <label className={lbl}>{t('Notes')}</label>
                 <textarea
                   name="notes"
                   value={formData.notes}
                   onChange={handleInputChange}
                   disabled={loading}
                   placeholder={t("Additional notes (optional)")}
                   rows={2}
                   className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none"
                 />
               </div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full sm:w-auto h-10 px-8 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase disabled:opacity-50">
               {loading ? t('Logging...') : t('Log Attendance')}
            </button>
          </form>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar / Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder={t("Search employee...")} 
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-container-high border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
          />
        </div>
      </div>

      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Employee')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Date')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Time In')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Time Out')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Shift')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Remarks')}</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Status')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
               <tr><td colSpan="7" className="px-4 py-12 text-center text-muted-foreground text-sm">No attendance logs found</td></tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="border-t border-border/50 hover:bg-surface-container-high/50 transition-colors">
                  <td className="px-4 py-3">
                     <span className="font-semibold text-foreground tracking-tight block">{log.employee?.fullName}</span>
                     <span className="text-[10px] text-muted-foreground uppercase">{t(log.employee?.designation)}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{new Date(log.date || log.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{formatTime(log.timeIn)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{log.timeOut ? formatTime(log.timeOut) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{log.shift || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{log.notes || '—'}</td>
                  <td className="px-4 py-3">
                     <StatusBadge status={log.isApproved ? 'Approved' : 'Pending'} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
