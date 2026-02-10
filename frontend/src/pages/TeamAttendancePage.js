import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/TeamAttendancePage.css';

const TeamAttendancePage = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    status: 'Present',
    remarks: ''
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load team members
      const teamResponse = await apiClient.get('/attendance/team-members');
      setTeamMembers(teamResponse.data.teamMembers || []);

      // Load attendance records for selected date
      const recordsResponse = await apiClient.get('/attendance/team', {
        params: { date: selectedDate }
      });
      setAttendanceRecords(recordsResponse.data.attendance || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

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

    if (!formData.employeeId || !formData.status) {
      setError('Please select employee and status');
      return;
    }

    try {
      const response = await apiClient.post('/attendance/mark-team', {
        employeeId: formData.employeeId,
        date: selectedDate,
        status: formData.status,
        remarks: formData.remarks
      });

      const selectedMember = teamMembers.find(m => m.id === formData.employeeId);
      setSuccessMessage(`Attendance marked for ${selectedMember?.fullName} - ${formData.status}`);
      
      setFormData({
        employeeId: '',
        status: 'Present',
        remarks: ''
      });
      setShowForm(false);

      // Reload records
      setTimeout(() => {
        loadData();
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

  const getTeamMemberName = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.fullName : 'Unknown';
  };

  const getTeamMemberRole = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.designation : 'Unknown';
  };

  return (
    <div className="team-attendance-container">
      <div className="attendance-header">
        <h2>Mark Team Attendance</h2>
        <p className="subtitle">Mark attendance for your team members</p>
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
        {/* Mark Attendance Section */}
        <div className="mark-section">
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
                  <label>Team Member *</label>
                  <select 
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleFormChange}
                    className="form-input"
                    required
                  >
                    <option value="">-- Select Team Member --</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.fullName} ({member.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <input 
                    type="text" 
                    value={formData.employeeId ? getTeamMemberRole(formData.employeeId) : ''}
                    disabled
                    className="form-input"
                  />
                </div>

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

              <button type="submit" className="btn btn-success">
                Mark Attendance
              </button>
            </form>
          )}
        </div>

        {/* Records Section */}
        <div className="records-section">
          <div className="section-header">
            <h3>Team Attendance Records</h3>
            <div className="search-group">
              <label>Date:</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
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
                    <th>Employee Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="employee-name">{record.employee?.fullName || 'Unknown'}</td>
                      <td>{record.employee?.designation || 'Unknown'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{record.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-records">
              No attendance records found for {new Date(selectedDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamAttendancePage;
