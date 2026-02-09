import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/DailyAttendancePage.css';

const DailyAttendancePage = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

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
  }, [selectedDate, loadAttendance, loadEmployees]);

  // Handle check-in/out toggle
  const handleAttendanceToggle = async (employeeId, isCheckedIn) => {
    try {
      setLoading(true);
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
      
      // Update local state
      const existingRecord = attendance.find(a => a.employeeId === employeeId);
      if (existingRecord) {
        setAttendance(
          attendance.map(a =>
            a.employeeId === employeeId ? response.data.data : a
          )
        );
      } else {
        setAttendance([...attendance, response.data.data]);
      }

      setMessage(isCheckedIn ? '✓ Checked in successfully' : '✓ Checked out successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating attendance:', error);
      setMessage('Failed to update attendance');
    } finally {
      setLoading(false);
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

  const canManageAttendance = [
    'Super Admin',
    'Director',
    'School Administrator',
    'Stable Manager',
    'Ground Supervisor',
    'Jamedar',
  ].includes(user?.designation);

  return (
    <div className="daily-attendance-page">
      <h1>📋 Daily Attendance Register</h1>
      <p className="role-description">
        Groomers check in/out with the toggle switch. Track daily attendance and work hours.
      </p>

      {message && <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

      <div className="attendance-header">
        <div className="header-left">
          <label>
            Select Date:
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>

          <label>
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
              filteredEmployees.map((groom) => {
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
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleAttendanceToggle(groom.id, !checked)}
                          disabled={loading || !canManageAttendance}
                        />
                        <span className="slider"></span>
                        <span className="toggle-label">{checked ? 'IN' : 'OUT'}</span>
                      </label>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyAttendancePage;
