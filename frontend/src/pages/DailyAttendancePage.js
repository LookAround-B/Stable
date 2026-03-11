import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

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
      const response = await apiClient.get('/attendance/daily', {
        params: {
          date: selectedDate,
        },
      });
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
      // Filter to show only grooms
      const groomersList = response.data.data?.filter(emp => emp.designation === 'Groom') || [];
      setEmployees(groomersList);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
    loadEmployees();
    setCurrentPage(1); // Reset pagination when date changes
  }, [selectedDate, loadAttendance, loadEmployees]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle check-in/out toggle
  const handleAttendanceToggle = async (employeeId, isCheckedIn) => {
    try {
      // Optimistic update — show the change immediately
      const optimisticRecord = {
        employeeId,
        checkInTime: isCheckedIn ? new Date().toISOString() : null,
        checkOutTime: isCheckedIn ? null : new Date().toISOString(),
        status: 'Present',
        remarks: isCheckedIn ? 'Checked in' : 'Checked out',
      };
      const existingBefore = attendance.find(a => a.employeeId === employeeId);
      if (existingBefore) {
        setAttendance(prev => prev.map(a => a.employeeId === employeeId ? { ...a, ...optimisticRecord } : a));
      } else {
        setAttendance(prev => [...prev, { id: `temp-${employeeId}`, ...optimisticRecord }]);
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      const payload = {
        employeeId,
        date: selectedDate,
        checkInTime: isCheckedIn ? `${selectedDate}T${timeStr}` : null,
        checkOutTime: isCheckedIn ? null : `${selectedDate}T${timeStr}`,
        status: 'Present',
        remarks: isCheckedIn ? 'Checked in' : 'Checked out',
      };

      const response = await apiClient.post('/attendance/daily', payload);
      
      // Replace optimistic record with real server data
      setAttendance(prev => {
        const exists = prev.find(a => a.employeeId === employeeId);
        if (exists) {
          return prev.map(a => a.employeeId === employeeId ? response.data.data : a);
        }
        return [...prev, response.data.data];
      });

      setMessage(isCheckedIn ? '✓ Checked in successfully' : '✓ Checked out successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating attendance:', error);
      // Revert optimistic update on failure
      loadAttendance();
      setMessage('Failed to update attendance');
    }
  };

  const isCheckedIn = (employeeId) => {
    const record = attendance.find(a => a.employeeId === employeeId);
    return record && record.checkInTime && !record.checkOutTime;
  };

  const getCheckInTime = (employeeId) => {
    const record = attendance.find(a => a.employeeId === employeeId);
    return record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-';
  };

  const getCheckOutTime = (employeeId) => {
    const record = attendance.find(a => a.employeeId === employeeId);
    return record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-';
  };

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const canManageAttendance = [
    'Super Admin',
    'Director',
    'School Administrator',
    'Stable Manager',
    'Ground Supervisor',
    'Jamedar',
  ].includes(user?.designation);

  if (!p.viewDailyAttendance) return <Navigate to="/" replace />;

  return (
    <div className="daily-attendance-page">
      <div className="page-header">
        <div>
          <h1>{t('Daily Attendance Register')}</h1>
          <p className="info-text">
            Groomers check in/out with the toggle switch. Track daily attendance and work hours.
          </p>
        </div>
      </div>

      {message && <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

      <div className="attendance-header">
        <div className="header-left">
          <label style={{display: 'flex', alignItems: 'center', gap: '12px', marginRight: '24px'}}>
            Select Date:
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>

          <label style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            Search:
            <input 
              type="text" 
              placeholder="Search by groom name or email..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Attendance Table with Toggle */}
      <>
      <div className="attendance-table-wrapper">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Groom Name</th>
              <th>Email</th>
              <th>Check In Time</th>
              <th>Check Out Time</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-data">
                  No groomers found
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((groom) => {
                const checked = isCheckedIn(groom.id);
                return (
                  <tr key={groom.id} className={checked ? 'checked-in' : 'checked-out'}>
                    <td className="employee-cell">
                      <strong>{groom.fullName}</strong>
                    </td>
                    <td>{groom.email}</td>
                    <td className="time-cell">{getCheckInTime(groom.id)}</td>
                    <td className="time-cell">{getCheckOutTime(groom.id)}</td>
                    <td className="status-cell">
                      <label className="attendance-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: canManageAttendance ? 'pointer' : 'default' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleAttendanceToggle(groom.id, !checked)}
                          disabled={!canManageAttendance}
                          style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'inherit' }}
                        />
                        <span className={`toggle-label ${checked ? 'checked-in-label' : 'checked-out-label'}`}>
                          {checked ? 'IN' : 'OUT'}
                        </span>
                      </label>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(newRows) => {
            setRowsPerPage(newRows);
            setCurrentPage(1);
          }}
          total={filteredEmployees.length}
        />
      </div>
      </>
    </div>
  );
};

export default DailyAttendancePage;
