import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import '../styles/AttendancePage.css';

const AttendancePage = () => {
  const { user } = useAuth();
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState([]);
  
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

  useEffect(() => {
    loadAttendanceLogs();
    if (['Ground Supervisor', 'Stable Manager', 'Director'].includes(user?.designation)) {
      loadEmployees();
    }
  }, [user?.designation]);

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
      setEmployees(response.data);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      
      // Reset form
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
    return new Date(dateStr).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isManager = ['Ground Supervisor', 'Stable Manager', 'Director'].includes(user?.designation);

  return (
    <div className="attendance-page">
      <h1>📋 Attendance Management</h1>
      <p className="subtitle">
        {isManager 
          ? 'Manage your team attendance' 
          : 'Log your attendance'}
      </p>

      <button 
        className="btn-add" 
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? '✕ Cancel' : '+ Log Attendance'}
      </button>

      {/* Attendance Form */}
      {showForm && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="attendance-form">
            {isManager && (
              <div className="form-group">
                <label htmlFor="employeeId">Employee *</label>
                <SearchableSelect
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  placeholder="-- Select Employee --"
                  required
                  disabled={loading}
                  options={[
                    { value: '', label: '-- Select Employee --' },
                    ...employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (${emp.designation})` }))
                  ]}
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="timeIn">Time In *</label>
                <input
                  id="timeIn"
                  type="datetime-local"
                  name="timeIn"
                  value={formData.timeIn}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="timeOut">Time Out</label>
                <input
                  id="timeOut"
                  type="datetime-local"
                  name="timeOut"
                  value={formData.timeOut}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>

            {requiresShift && (
              <div className="form-group">
                <label htmlFor="shift">Shift *</label>
                <select
                  id="shift"
                  name="shift"
                  value={formData.shift}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  <option value="">-- Select Shift --</option>
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>

            {message && (
              <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-submit" 
              disabled={loading}
            >
              {loading ? 'Logging...' : 'Log Attendance'}
            </button>
          </form>
        </div>
      )}

      {/* Attendance Logs Table */}
      <div className="logs-container">
        <h2>Recent Attendance</h2>
        {attendanceLogs.length === 0 ? (
          <p className="no-data">No attendance logs found</p>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Shift</th>
                <th>Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.employee.fullName}</strong>
                    <br />
                    <small>{log.employee.designation}</small>
                  </td>
                  <td>{new Date(log.date).toLocaleDateString('en-IN')}</td>
                  <td>{formatTime(log.timeIn)}</td>
                  <td>{log.timeOut ? formatTime(log.timeOut) : '—'}</td>
                  <td>{log.shift || '—'}</td>
                  <td>{log.notes || '—'}</td>
                  <td>
                    <span className={`badge ${log.isApproved ? 'approved' : 'pending'}`}>
                      {log.isApproved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
