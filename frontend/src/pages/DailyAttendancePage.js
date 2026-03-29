import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Users, UserCheck, UserX } from 'lucide-react';
import * as XLSX from 'xlsx';
import DatePicker from '../components/shared/DatePicker';

const DailyAttendancePage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/attendance/daily', { params: { date: selectedDate } });
      setAttendance(response.data.data || []);
      setMessage('');
    } catch (error) {
      console.error('Error loading attendance:', error);
      setMessage('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      const groomersList = response.data.data?.filter(emp => emp.designation === 'Groom') || [];
      setEmployees(groomersList);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  useEffect(() => { loadAttendance(); loadEmployees(); setCurrentPage(1); }, [selectedDate, loadAttendance, loadEmployees]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleAttendanceToggle = async (employeeId, isCheckedIn) => {
    try {
      const optimisticRecord = { employeeId, checkInTime: isCheckedIn ? new Date().toISOString() : null, checkOutTime: isCheckedIn ? null : new Date().toISOString(), status: 'Present', remarks: isCheckedIn ? 'Checked in' : 'Checked out' };
      const existingBefore = attendance.find(a => a.employeeId === employeeId);
      if (existingBefore) { setAttendance(prev => prev.map(a => a.employeeId === employeeId ? { ...a, ...optimisticRecord } : a)); }
      else { setAttendance(prev => [...prev, { id: `temp-${employeeId}`, ...optimisticRecord }]); }

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      const payload = { employeeId, date: selectedDate, checkInTime: isCheckedIn ? `${selectedDate}T${timeStr}` : null, checkOutTime: isCheckedIn ? null : `${selectedDate}T${timeStr}`, status: 'Present', remarks: isCheckedIn ? 'Checked in' : 'Checked out' };
      const response = await apiClient.post('/attendance/daily', payload);
      setAttendance(prev => { const exists = prev.find(a => a.employeeId === employeeId); if (exists) return prev.map(a => a.employeeId === employeeId ? response.data.data : a); return [...prev, response.data.data]; });
      setMessage(isCheckedIn ? '✓ Checked in successfully' : '✓ Checked out successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating attendance:', error);
      loadAttendance();
      setMessage('Failed to update attendance');
    }
  };

  const isCheckedIn = (employeeId) => { const record = attendance.find(a => a.employeeId === employeeId); return record && record.checkInTime && !record.checkOutTime; };
  const getCheckInTime = (employeeId) => { const record = attendance.find(a => a.employeeId === employeeId); return record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'; };
  const getCheckOutTime = (employeeId) => { const record = attendance.find(a => a.employeeId === employeeId); return record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'; };

  const filteredEmployees = employees.filter(emp => emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || emp.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + rowsPerPage);

  const canManageAttendance = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor', 'Jamedar'].includes(user?.designation);

  const checkedInCount = employees.filter(e => isCheckedIn(e.id)).length;

  const handleDownloadExcel = () => {
    if (!filteredEmployees.length) { alert('No data'); return; }
    const data = filteredEmployees.map(groom => ({ 'Groom Name': groom.fullName, 'Email': groom.email, 'Check In': getCheckInTime(groom.id), 'Check Out': getCheckOutTime(groom.id), 'Status': isCheckedIn(groom.id) ? 'IN' : 'OUT' }));
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data); XLSX.utils.book_append_sheet(wb, ws, 'Daily Attendance'); XLSX.writeFile(wb, `DailyAttendance_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!p.viewDailyAttendance) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t('Daily Attendance')} <span className="text-primary">Register</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Groomers check in/out with the toggle. Track daily attendance.</p>
        </div>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('Failed') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}</div>}

      {/* KPI Cards */}
      <div className="daily-attendance-kpi-grid grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'TOTAL GROOMS', value: String(employees.length).padStart(2, '0'), icon: Users, sub: 'Assigned groom roster' },
          { label: 'CHECKED IN', value: String(checkedInCount).padStart(2, '0'), icon: UserCheck, sub: 'Currently on duty', subColor: 'text-success', colorClass: 'text-success', bgClass: 'bg-success/10' },
          { label: 'CHECKED OUT', value: String(employees.length - checkedInCount).padStart(2, '0'), icon: UserX, sub: 'Out of shift', subColor: 'text-warning', colorClass: 'text-warning', bgClass: 'bg-warning/10' },
        ].map((k, index) => (
          <div key={k.label} className={index === 2 ? 'daily-attendance-kpi-card--wide-mobile col-span-2 sm:col-span-1' : ''}>
            <OperationalMetricCard label={k.label} value={k.value} icon={k.icon} colorClass={k.colorClass || 'text-primary'} bgClass={k.bgClass || 'bg-primary/10'} sub={k.sub} subColor={k.subColor || 'text-muted-foreground'} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3">
        <div className="relative flex-1 max-w-sm">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Search</label>
          <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 w-full px-3 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Date</label>
          <DatePicker value={selectedDate} onChange={(val) => setSelectedDate(val)} />
        </div>
        <button onClick={handleDownloadExcel} className="ml-auto h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2"><Download className="w-4 h-4" /> Excel</button>
      </div>

      {/* Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Groom Name', 'Email', 'Check In', 'Check Out', 'Status'].map(h => (
                  <th key={h} className={`px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${h === 'Status' ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr><td colSpan="5" className="px-3 py-12 text-center text-muted-foreground">No groomers found</td></tr>
              ) : (
                paginatedEmployees.map((groom) => {
                  const checked = isCheckedIn(groom.id);
                  return (
                    <tr key={groom.id} className={`border-b border-border/50 hover:bg-surface-container-high transition-colors ${checked ? 'bg-success/5' : ''}`}>
                      <td className="px-3 py-3 font-medium text-foreground">{groom.fullName}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{groom.email}</td>
                      <td className="px-3 py-3 text-muted-foreground mono-data whitespace-nowrap">{getCheckInTime(groom.id)}</td>
                      <td className="px-3 py-3 text-muted-foreground mono-data whitespace-nowrap">{getCheckOutTime(groom.id)}</td>
                      <td className="px-3 py-3 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={() => handleAttendanceToggle(groom.id, !checked)} disabled={!canManageAttendance} className="w-4 h-4 rounded accent-primary cursor-pointer disabled:cursor-default" />
                          <span className={`text-xs font-bold uppercase tracking-wider ${checked ? 'text-success' : 'text-muted-foreground'}`}>{checked ? 'IN' : 'OUT'}</span>
                        </label>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }} total={filteredEmployees.length} />
      </div>
    </div>
  );
};

export default DailyAttendancePage;
