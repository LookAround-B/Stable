import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/DigitalAttendancePage.css';

const DigitalAttendancePage = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    loadAttendanceRecords();
  }, [loadAttendanceRecords]);

  // Auto-set to WOFF if date is Monday
  useEffect(() => {
    const dateObj = new Date(formData.date);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday
    if (dayOfWeek === 1 && formData.status !== 'WOFF') {
      setFormData(prev => ({
        ...prev,
        status: 'WOFF'
      }));
    }
  }, [formData.date, formData.status]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

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
      setFormData({
        date: new Date().toISOString().split('T')[0],
        status: 'Present',
        remarks: ''
      });
      setShowForm(false);

      // Reload records
      setTimeout(() => {
        loadAttendanceRecords();
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark attendance');
      console.error('Error marking attendance:', err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Present': return 'status-present';
      case 'Absent': return 'status-absent';
      case 'Leave': return 'status-leave';
      case 'WOFF': return 'status-woff';
      case 'Half Day': return 'status-halfday';
      default: return '';
    }
  };

  const isMonday = () => {
    const dateObj = new Date(formData.date);
    return dateObj.getDay() === 1; // 1 = Monday
  };

  return (
    <div className="digital-attendance-container">
      <div className="attendance-header">
        <h2>Digital Attendance</h2>
        <p className="subtitle">Manual attendance logging for {user?.fullName || 'Staff'}</p>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          ✕ {error}
        </div>
      )}

      <div className="attendance-content">
        {/* Quick Mark Attendance Section */}
        <div className="quick-mark-section">
          <div className="section-header">
            <h3>Quick Mark Attendance</h3>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : '+ Mark Attendance'}
            </button>
          </div>

          {showForm && (
            <form className="attendance-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee Name</label>
                  <input 
                    type="text" 
                    value={user?.fullName || ''} 
                    disabled
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date" 
                    name="date"
                    value={formData.date}
                    onChange={handleFormChange}
                    className="form-input"
                    required
                  />
                  {isMonday() && (
                    <span className="form-hint">📅 Monday is weekly off (WOFF)</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Attendance Status *</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="form-input"
                    required
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                    <option value="WOFF">Weekly Off</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Remarks (Optional)</label>
                  <input 
                    type="text" 
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleFormChange}
                    placeholder="Add any notes..."
                    className="form-input"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-success">
                Submit Attendance
              </button>
            </form>
          )}
        </div>

        {/* Attendance Records Section */}
        <div className="records-section">
          <div className="section-header">
            <h3>Attendance Records</h3>
            <div className="search-group">
              <label>Search Date:</label>
              <input 
                type="date" 
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading attendance records...</div>
          ) : attendanceRecords.length > 0 ? (
            <div className="records-table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check-in Time</th>
                    <th>Check-out Time</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}</td>
                      <td>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}</td>
                      <td>{record.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-records">
              No attendance records found for {new Date(searchDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalAttendancePage;
