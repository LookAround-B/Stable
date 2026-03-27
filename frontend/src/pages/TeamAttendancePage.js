import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { Download, Plus, X, Users, UserCheck, CalendarCheck, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const inp = 'w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none';
const lbl = 'label-sm text-muted-foreground block mb-1.5 uppercase tracking-wider text-[10px] font-semibold';

const StatusBadge = ({ status }) => {
  if (!status) return <span>-</span>;
  let cls = 'bg-surface-container-high text-muted-foreground border-border';
  if (status === 'Present') cls = 'bg-success/20 text-success border-success/30';
  else if (status === 'Absent') cls = 'bg-destructive/20 text-destructive border-destructive/30';
  else if (status === 'Leave' || status === 'Half Day') cls = 'bg-warning/20 text-warning border-warning/30';
  else if (status === 'WOFF') cls = 'bg-primary/20 text-primary border-primary/30';
  return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>{status}</span>;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Mark Team')} <span className="text-primary">{t('Attendance')}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Mark attendance for team members')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleDownloadExcel} className="h-9 px-3 sm:px-4 rounded-lg border border-border text-foreground text-sm font-medium flex items-center gap-2 hover:bg-surface-container-high transition-colors">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t('Export')}</span>
          </button>
          <button onClick={() => setShowForm(!showForm)} className="h-9 px-4 sm:px-5 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showForm ? t('Cancel') : t('Mark Attendance')}</span><span className="sm:hidden">{t('Mark')}</span>
          </button>
        </div>
      </div>

      {successMessage && <div className="p-4 rounded-lg text-sm font-medium bg-success/15 text-success border border-success/30">✓ {successMessage}</div>}
      {error && <div className="p-4 rounded-lg text-sm font-medium bg-destructive/15 text-destructive border border-destructive/30">✕ {error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Team Members')}</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground">{String(teamMembers.length).padStart(2, '0')}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Total Marked')}</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><CalendarCheck className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground">{String(attendanceRecords.length).padStart(2, '0')}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Present')}</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center"><UserCheck className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-success">{String(presentCount).padStart(2, '0')}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Absent / Leave')}</span>
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center"><Clock className="w-4 h-4 text-destructive" /></div>
          </div>
          <p className="text-3xl font-bold text-destructive">{String(absentCount).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 border border-primary/20 shadow-lg edge-glow">
          <h3 className="text-lg font-bold text-foreground mb-5 pb-3 border-b border-border/50">{t('Quick Mark Attendance')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="z-10">
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
              <div>
                <label className={lbl}>{t('Date')} *</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required className={inp} />
                {isMonday() && <span className="text-[10px] text-primary font-medium uppercase tracking-wider mt-1.5 block">⚠ Monday is weekly off (WOFF)</span>}
              </div>
              <div>
                <label className={lbl}>{t('Role')}</label>
                <input type="text" value={formData.employeeId ? t(getTeamMemberRole(formData.employeeId)) : ''} disabled className={`${inp} opacity-50`} />
              </div>
              <div className="z-10">
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
              <div className="md:col-span-2">
                <label className={lbl}>{t('Remarks (Optional)')}</label>
                <input type="text" name="remarks" value={formData.remarks} onChange={handleFormChange} placeholder={t("Add any notes...")} className={inp} />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full md:w-auto h-10 px-8 rounded-lg bg-gradient-to-r from-success to-success/80 text-white text-sm font-semibold tracking-wider uppercase hover:opacity-90 transition-opacity">
                {t('Mark Attendance')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">{t('Records for:')}</label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={`${inp} max-w-[200px]`} />
      </div>

      {/* Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : attendanceRecords.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-surface-container-high border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Employee')}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Role')}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Status')}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Remarks')}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t('Marked At')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{record.employee?.fullName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{record.employee?.designation ? t(record.employee.designation) : 'Unknown'}</td>
                      <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{record.remarks || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {record.markedAt ? (() => {
                          const date = new Date(record.markedAt);
                          return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-GB')}`;
                        })() : 'Not marked'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
                total={attendanceRecords.length}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {t('No attendance records found for')} {new Date(selectedDate).toLocaleDateString('en-GB')}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamAttendancePage;
