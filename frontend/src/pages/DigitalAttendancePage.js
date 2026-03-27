import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { useI18n } from '../context/I18nContext';
import { Download, Plus, X, CalendarCheck, Clock, CheckCircle2, History, Calendar, LayoutDashboard } from 'lucide-react';
import * as XLSX from 'xlsx';

const inp = 'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none disabled:opacity-50';
const lbl = 'label-sm text-muted-foreground block mb-1.5 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1.5';

const StatusBadge = ({ status }) => {
  if (!status) return <span className="text-muted-foreground">-</span>;
  if (status.toLowerCase() === 'present') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-success"><span className="w-1.5 h-1.5 rounded-full bg-success" /> PRESENT</span>;
  if (status.toLowerCase() === 'absent') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-destructive"><span className="w-1.5 h-1.5 rounded-full bg-destructive" /> ABSENT</span>;
  if (status.toLowerCase().includes('half') || status.toLowerCase().includes('leave')) return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-warning"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> {status.toUpperCase()}</span>;
  if (status.toLowerCase() === 'woff') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> WEEKLY OFF</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted" /> {status.toUpperCase()}</span>;
};

const DigitalAttendancePage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'Present',
    remarks: ''
  });
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const loadAttendanceRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/attendance/personal`, {
        params: { date: searchDate }
      });
      setAttendanceRecords(response.data.records || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load attendance records');
      console.error('Error loading records:', err);
    } finally {
      setLoading(false);
    }
  }, [searchDate]);

  useEffect(() => { loadAttendanceRecords(); }, [loadAttendanceRecords]);

  // Auto-set to WOFF if date is Monday
  useEffect(() => {
    const dateObj = new Date(formData.date);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday
    if (dayOfWeek === 1 && formData.status !== 'WOFF') {
      setFormData(prev => ({ ...prev, status: 'WOFF' }));
    }
  }, [formData.date, formData.status]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMessage('');
    if (!formData.date || !formData.status) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      await apiClient.post('/attendance/digital', {
        date: formData.date,
        status: formData.status,
        remarks: formData.remarks
      });
      setSuccessMessage(`Attendance marked successfully - ${formData.status}`);
      setFormData({ date: new Date().toISOString().split('T')[0], status: 'Present', remarks: '' });
      setShowForm(false);
      setTimeout(() => { loadAttendanceRecords(); setSuccessMessage(''); }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const isMonday = () => new Date(formData.date).getDay() === 1;

  const handleDownloadExcel = () => {
    if (!attendanceRecords.length) { alert('No records'); return; }
    const data = attendanceRecords.map(r => ({
      'Date': new Date(r.date).toLocaleDateString('en-GB'),
      'Status': r.status,
      'Check-in Time': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '',
      'Check-out Time': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '',
      'Remarks': r.remarks || ''
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'My Attendance');
    XLSX.writeFile(wb, `MyAttendance_${searchDate}.xlsx`);
  };

  const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
  const leaveCount = attendanceRecords.filter(r => ['Absent', 'Leave', 'Half Day'].includes(r.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Digital Attendance')}</h1>
          <p className="text-sm text-muted-foreground mt-1">Manual attendance logging for <span className="text-primary font-medium">{user?.fullName || 'Staff'}</span></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleDownloadExcel} className="h-10 px-4 sm:px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t('Export')}</span>
          </button>
          <button onClick={() => setShowForm(!showForm)} className="h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showForm ? t('Cancel') : t('Mark Attendance')}</span>
          </button>
        </div>
      </div>

      {successMessage && <div className="p-4 rounded-lg text-sm font-medium bg-success/15 text-success border border-success/30 flex items-center gap-2">✓ {successMessage}</div>}
      {error && <div className="p-4 rounded-lg text-sm font-medium bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-2">✕ {error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><History className="w-3.5 h-3.5 text-primary" /> MONTH LOGS</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{String(attendanceRecords.length).padStart(2, '0')}</p>
          <p className="text-xs mt-1 text-muted-foreground">Total records found</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> PRESENT</p>
          <p className="text-4xl font-bold text-success mt-2 mono-data">{String(presentCount).padStart(2, '0')}</p>
          <p className="text-xs mt-1 text-success">Total present days</p>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><CalendarCheck className="w-3.5 h-3.5 text-warning" /> ABSENCES</p>
          <p className="text-4xl font-bold text-warning mt-2 mono-data">{String(leaveCount).padStart(2, '0')}</p>
          <p className="text-xs mt-1 text-warning">Total leaves & absences</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 border border-primary/20 shadow-lg relative edge-glow">
          <h3 className="text-lg font-bold text-foreground mb-5 pb-3 border-b border-border/50">{t('Quick Mark Attendance')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>{t('Employee Name')}</label>
                <input type="text" value={user?.fullName || ''} disabled className={inp} />
              </div>
              <div>
                <label className={lbl}>{t('Date')} *</label>
                <input type="date" name="date" value={formData.date} onChange={handleFormChange} required className={inp} />
              </div>
              <div>
                <label className={lbl}>{t('Attendance Status')} *</label>
                <select name="status" value={formData.status} onChange={handleFormChange} required className={inp}>
                  <option value="Present">{t('Present')}</option>
                  <option value="Absent">{t('Absent')}</option>
                  <option value="Leave">{t('Leave')}</option>
                  <option value="WOFF">{t('Weekly Off')}</option>
                  <option value="Half Day">{t('Half Day')}</option>
                </select>
              </div>
              <div>
                <label className={lbl}>{t('Remarks (Optional)')}</label>
                <input type="text" name="remarks" value={formData.remarks} onChange={handleFormChange} placeholder={t("Add any notes...")} className={inp} />
              </div>
            </div>
            {isMonday() && <span className="text-[10px] text-primary font-medium uppercase tracking-wider block bg-primary/10 px-3 py-1.5 rounded w-fit mt-1 border border-primary/30">⚠ Monday is weekly off (WOFF)</span>}
            <div className="pt-2 flex gap-3">
              <button type="submit" className="h-10 px-8 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase hover:brightness-110 transition-all">
                {t('Submit Attendance')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{t('Records for Date:')}</span>
            <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="h-9 px-3 rounded-lg bg-surface-container border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <span className="text-xs text-muted-foreground mono-data hidden sm:block">{attendanceRecords.length} records</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : attendanceRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  {['DATE', 'STATUS', 'CHECK-IN', 'CHECK-OUT', 'REMARKS'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => {
                  const isAbs = record.status === 'Absent' || record.status === 'Leave';
                  return (
                    <tr key={record.id} className={`border-b border-border/50 hover:bg-surface-container-high/50 transition-colors ${isAbs ? 'bg-destructive/5' : ''}`}>
                      <td className="px-6 py-4 font-mono text-sm text-foreground">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">{record.remarks || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {t('No attendance records found for')} {new Date(searchDate).toLocaleDateString('en-GB')}
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalAttendancePage;
