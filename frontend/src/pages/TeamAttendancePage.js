import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { Download, Plus, X, Users, CalendarCheck, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import DatePicker from '../components/shared/DatePicker';

const inp = 'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none';
const lbl = 'label-sm text-muted-foreground block mb-1.5 uppercase tracking-wider text-[10px] font-semibold flex items-center gap-1.5';

const StatusBadge = ({ status }) => {
  if (!status) return <span>-</span>;
  if (status === 'Present') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-success"><span className="w-1.5 h-1.5 rounded-full bg-success" /> PRESENT</span>;
  if (status === 'Absent') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-destructive"><span className="w-1.5 h-1.5 rounded-full bg-destructive" /> ABSENT</span>;
  if (status === 'Leave' || status === 'Half Day') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-warning"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> {status.toUpperCase()}</span>;
  if (status === 'WOFF') return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> WEEKLY OFF</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted" /> {status}</span>;
};

const TeamAttendancePage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const [teamMembers, setTeamMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ employeeId: '', status: 'Present', remarks: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    loadData();
    setCurrentPage(1);
    const dateObj = new Date(selectedDate);
    if (dateObj.getDay() === 1) {
      setFormData(prev => ({ ...prev, status: 'WOFF' }));
    }
  }, [selectedDate]); // eslint-disable-line

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const teamResponse = await apiClient.get('/attendance/team-members', { params: { date: selectedDate } });
      setTeamMembers(teamResponse.data.teamMembers || []);
      const recordsResponse = await apiClient.get('/attendance/team', { params: { date: selectedDate } });
      setAttendanceRecords(recordsResponse.data.attendance || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally { setLoading(false); }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccessMessage('');
    if (!formData.employeeId || !formData.status) { setError('Please select employee and status'); return; }
    try {
      await apiClient.post('/attendance/mark-team', {
        employeeId: formData.employeeId, date: selectedDate,
        status: formData.status, remarks: formData.remarks
      });
      const selectedMember = teamMembers.find(m => m.id === formData.employeeId);
      setSuccessMessage(`Attendance marked for ${selectedMember?.fullName} - ${formData.status}`);
      setFormData({ employeeId: '', status: 'Present', remarks: '' });
      setShowForm(false);
      setTimeout(() => { loadData(); setSuccessMessage(''); }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark attendance');
    }
  };

  const getTeamMemberRole = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.designation : 'Unknown';
  };

  const isMonday = () => new Date(selectedDate).getDay() === 1;

  const handleDownloadExcel = () => {
    if (attendanceRecords.length === 0) { alert('No attendance records to download'); return; }
    const excelData = attendanceRecords.map((record) => ({
      'Date': record.date ? new Date(record.date).toLocaleDateString('en-GB') : '',
      'Employee Name': record.employee?.fullName || '-',
      'Designation': record.employee?.designation || '-',
      'Status': record.status,
      'Remarks': record.remarks || '',
      'Marked At': record.markedAt ? new Date(record.markedAt).toLocaleString('en-GB') : '',
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `Attendance_${selectedDate}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalPages = Math.ceil(attendanceRecords.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRecords = attendanceRecords.slice(startIndex, startIndex + rowsPerPage);
  const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;

  if (!p.viewTeamAttendance) return <Navigate to="/dashboard" replace />;

  return (
    <div className="team-attendance-page space-y-6">
      {/* Header */}
      <div className="team-attendance-header-row flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Mark Team')} <span className="text-primary">{t('Attendance')}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Manage and report daily attendance for staff')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowForm(!showForm)} className="team-attendance-header-btn h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showForm ? t('Cancel') : t('Mark Attendance')}</span>
          </button>
        </div>
      </div>

      {successMessage && <div className="p-4 rounded-lg text-sm font-medium bg-success/15 text-success border border-success/30">✓ {successMessage}</div>}
      {error && <div className="p-4 rounded-lg text-sm font-medium bg-destructive/15 text-destructive border border-destructive/30">✕ {error}</div>}

      {/* KPI Cards (EFM matched) */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        <OperationalMetricCard label="TEAM MEMBERS" value={String(teamMembers.length).padStart(2, '0')} icon={Users} colorClass="text-primary" bgClass="bg-primary/10" sub="Total assigned staff" hideSub />
        <OperationalMetricCard label="TOTAL MARKED" value={String(attendanceRecords.length).padStart(2, '0')} icon={CalendarCheck} colorClass="text-primary" bgClass="bg-primary/10" sub="Records saved today" subColor="text-primary" hideSub />
        <OperationalMetricCard label="PRESENT" value={String(presentCount).padStart(2, '0')} icon={CheckCircle2} colorClass="text-success" bgClass="bg-success/10" sub="Currently on shift" subColor="text-success" valueClass="text-3xl font-bold text-success mt-1 mono-data relative z-10" hideSub />
        <OperationalMetricCard label="ABSENT / LEAVE" value={String(absentCount).padStart(2, '0')} icon={XCircle} colorClass="text-destructive" bgClass="bg-destructive/10" sub="Unavailable staff" subColor="text-destructive" valueClass="text-3xl font-bold text-destructive mt-1 mono-data relative z-10" hideSub />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 border border-primary/20 shadow-lg edge-glow">
          <h3 className="text-lg font-bold text-foreground mb-5 pb-3 border-b border-border/50">{t('Quick Mark Attendance')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="z-10 relative">
                <label className={lbl}>{t('Team Member')} *</label>
                <SearchableSelect
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleFormChange}
                  placeholder="-- Select Team Member --"
                  required
                  options={[
                    { value: '', label: '-- Select Team Member --' },
                    ...teamMembers.map(m => ({ value: m.id, label: `${m.fullName} (${m.designation})` }))
                  ]}
                />
              </div>
              <div className="relative">
                <label className={lbl}>{t('Attendance Status')} *</label>
                <SearchableSelect
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                  options={[
                    { value: 'Present', label: t('Present') },
                    { value: 'Absent', label: t('Absent') },
                    { value: 'Leave', label: t('Leave') },
                    { value: 'WOFF', label: t('Weekly Off') },
                    { value: 'Half Day', label: t('Half Day') },
                  ]}
                  placeholder="Select status..."
                  searchable={false}
                  required
                />
              </div>
              <div>
                <label className={lbl}>{t('Date')} *</label>
                <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} required />
              </div>
              <div>
                <label className={lbl}>{t('Role')}</label>
                <input type="text" value={formData.employeeId ? t(getTeamMemberRole(formData.employeeId)) : ''} disabled className={`${inp} opacity-50`} />
              </div>
              <div className="md:col-span-4">
                <label className={lbl}>{t('Remarks (Optional)')}</label>
                <input type="text" name="remarks" value={formData.remarks} onChange={handleFormChange} placeholder={t("Add any notes...")} className={inp} />
              </div>
            </div>
            {isMonday() && <span className="text-[10px] text-primary font-medium uppercase tracking-wider block bg-primary/10 px-3 py-1.5 rounded w-fit mt-1 border border-primary/30">⚠ Monday is weekly off (WOFF)</span>}
            <div className="pt-2 flex gap-3">
              <button type="submit" className="h-10 px-8 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase hover:brightness-110 transition-all">
                {t('Mark Attendance')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        {/* Toolbar */}
        <div className="team-attendance-toolbar flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{t('Records for:')}</span>
            <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} className="w-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mono-data hidden sm:block">{attendanceRecords.length} records</span>
            <button onClick={handleDownloadExcel} className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t('Export')}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : attendanceRecords.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    {['EMPLOYEE', 'ROLE', 'STATUS', 'REMARKS', 'MARKED AT'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => {
                    const statusStr = record.status || '';
                    const isAbs = statusStr === 'Absent' || statusStr === 'Leave';
                    
                    return (
                      <tr key={record.id} className={`border-b border-border/50 hover:bg-surface-container-high/50 transition-colors ${isAbs ? 'bg-destructive/5' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-xs font-bold text-primary shrink-0">{(record.employee?.fullName || '?').charAt(0).toUpperCase()}</div>
                            <span className="font-semibold text-sm text-foreground">{record.employee?.fullName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-container text-foreground`}>{record.employee?.designation ? t(record.employee.designation) : 'UNKNOWN'}</span>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{record.remarks || '-'}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground mono-data">
                          {record.markedAt ? (() => {
                            const date = new Date(record.markedAt);
                            return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
                          })() : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
              total={attendanceRecords.length}
            />
          </>
        ) : (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {t('No attendance records found for')} {new Date(selectedDate).toLocaleDateString('en-GB')}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamAttendancePage;




