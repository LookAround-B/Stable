import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';
import { useI18n } from '../context/I18nContext';

const TeamAttendancePage = () => {
  const { t } = useI18n();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    loadData();
    setCurrentPage(1); // Reset pagination when date changes
    // Check if selected date is Monday and auto-set status to WOFF
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday
    if (dayOfWeek === 1) {
      setFormData(prev => ({
        ...prev,
        status: 'WOFF'
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load team members (excluding those already marked for this date)
      const teamResponse = await apiClient.get('/attendance/team-members', {
        params: { date: selectedDate }
      });
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
      await apiClient.post('/attendance/mark-team', {
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

  const getTeamMemberRole = (memberId) => {
    const member = teamMembers.find(m => m.id === memberId);
    return member ? member.designation : 'Unknown';
  };

  const isMonday = () => {
    const dateObj = new Date(selectedDate);
    return dateObj.getDay() === 1; // 1 = Monday
  };

  const handleDownloadExcel = () => {
    if (attendanceRecords.length === 0) {
      alert('No attendance records to download');
      return;
    }

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    };

    // Prepare data for Excel
    const excelData = attendanceRecords.map((record) => ({
      'Date': formatDate(record.date),
      'Employee Name': record.employee?.fullName || '-',
      'Designation': record.employee?.designation || '-',
      'Status': record.status,
      'Remarks': record.remarks || '',
      'Marked At': record.markedAt ? new Date(record.markedAt).toLocaleString('en-GB') : '',
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Employee Name
      { wch: 18 }, // Designation
      { wch: 12 }, // Status
      { wch: 25 }, // Remarks
      { wch: 18 }, // Marked At
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    // Generate filename with date
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `Attendance_${selectedDate}_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
    console.log('📥 Downloaded attendance to:', filename);
  };

  const handleDownloadCSV = () => {
    if (attendanceRecords.length === 0) {
      alert('No attendance records to download');
      return;
    }

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    };

    const csvData = attendanceRecords.map((record) => ({
      'Date': formatDate(record.date),
      'Employee Name': record.employee?.fullName || '-',
      'Designation': record.employee?.designation || '-',
      'Status': record.status,
      'Remarks': record.remarks || '',
      'Marked At': record.markedAt ? new Date(record.markedAt).toLocaleString('en-GB') : '',
    }));

    const headers = Object.keys(csvData[0]);
    const escape = (val) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [headers.map(escape).join(','), ...csvData.map(row => headers.map(h => escape(row[h])).join(','))];
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_${selectedDate}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Pagination logic
  const totalPages = Math.ceil(attendanceRecords.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRecords = attendanceRecords.slice(startIndex, endIndex);

  return (
    <div className="team-attendance-container">
      <div className="attendance-header">
        <h2>{t('Mark Team Attendance')}</h2>
        <p className="subtitle">Mark attendance for team members</p>
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
            <div className="header-buttons">
              <button 
                className="btn btn-download"
                onClick={handleDownloadExcel}
              >
                Download Excel
              </button>
              <button 
                className="btn btn-download"
                onClick={handleDownloadCSV}
              >
                Download CSV
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? 'Cancel' : '+ Mark Attendance'}
              </button>
            </div>
          </div>

          {showForm && (
            <form className="attendance-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Team Member *</label>
                  <SearchableSelect
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleFormChange}
                    placeholder="-- Select Team Member --"
                    required
                    className="form-input"
                    options={[
                      { value: '', label: '-- Select Team Member --' },
                      ...teamMembers.map(m => ({ value: m.id, label: `${m.fullName} (${m.designation})` }))
                    ]}
                  />
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
                  {isMonday() && (
                    <span className="form-hint">📅 Monday is weekly off (WOFF)</span>
                  )}
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
                  <SearchableSelect
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    options={[
                      { value: 'Present', label: 'Present' },
                      { value: 'Absent', label: 'Absent' },
                      { value: 'Leave', label: 'Leave' },
                      { value: 'WOFF', label: 'Weekly Off' },
                      { value: 'Half Day', label: 'Half Day' },
                    ]}
                    placeholder="Select status..."
                    searchable={false}
                    required
                  />
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
          <div className="section-header" style={{ justifyContent: 'flex-start', gap: '20px' }}>
            <h3>Team Attendance Records</h3>
            <div className="search-group">
              <label>Date:</label>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '12px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading attendance records...</div>
          ) : attendanceRecords.length > 0 ? (
            <>
            <div className="records-table-wrapper">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="employee-name">{record.employee?.fullName || 'Unknown'}</td>
                      <td>{record.employee?.designation ? t(record.employee.designation) : 'Unknown'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>
                          {t(record.status)}
                        </span>
                      </td>
                      <td>{record.remarks || '-'}</td>
                      <td>
                        {record.markedAt ? (() => {
                          const date = new Date(record.markedAt);
                          const dateStr = date.toLocaleDateString('en-GB');
                          const timeStr = date.toLocaleTimeString('en-GB');
                          return `${dateStr} [${timeStr}]`;
                        })() : 'Not marked'}
                      </td>
                    </tr>
                  ))}
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
                total={attendanceRecords.length}
              />
            </div>
            </>
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
