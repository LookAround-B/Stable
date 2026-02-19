import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/GateAttendancePage.css';
import * as XLSX from 'xlsx';

const GateAttendancePage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' or 'visitor'

  const [staffForm, setStaffForm] = useState({
    employeeId: '',
    entryTime: new Date().toISOString().slice(0, 16),
    exitTime: '',
    shift: 'Morning',
    notes: '',
  });

  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    purpose: '',
    entryTime: new Date().toISOString().slice(0, 16),
    exitTime: '',
    contact: '',
    notes: '',
  });

  const SHIFTS = ['Morning', 'Afternoon', 'Evening', 'Night'];

  useEffect(() => {
    loadGateLogs();
    loadEmployees();
  }, []);

  const loadGateLogs = async () => {
    try {
      const response = await apiClient.get('/gate-attendance');
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading gate logs:', error);
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

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!staffForm.employeeId) {
        throw new Error('Please select an employee');
      }

      const selectedEmployee = employees.find((e) => e.id === staffForm.employeeId);
      
      const payload = {
        guardId: user?.id,
        personName: selectedEmployee?.fullName,
        personType: 'Staff',
        entryTime: new Date(staffForm.entryTime),
        exitTime: staffForm.exitTime ? new Date(staffForm.exitTime) : null,
        notes: staffForm.notes ? `Shift: ${staffForm.shift}\n${staffForm.notes}` : `Shift: ${staffForm.shift}`,
      };

      const response = await apiClient.post('/gate-attendance', payload);
      
      setMessage('✓ Staff entry logged successfully!');
      setLogs([response.data, ...logs]);
      setShowStaffForm(false);

      setStaffForm({
        employeeId: '',
        entryTime: new Date().toISOString().slice(0, 16),
        exitTime: '',
        shift: 'Morning',
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

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!visitorForm.visitorName || !visitorForm.purpose) {
        throw new Error('Please provide visitor name and purpose');
      }

      const payload = {
        guardId: user?.id,
        personName: visitorForm.visitorName,
        personType: 'Visitor',
        entryTime: new Date(visitorForm.entryTime),
        exitTime: visitorForm.exitTime ? new Date(visitorForm.exitTime) : null,
        notes: visitorForm.notes ? `Purpose: ${visitorForm.purpose}\nContact: ${visitorForm.contact || 'N/A'}\n${visitorForm.notes}` : `Purpose: ${visitorForm.purpose}\nContact: ${visitorForm.contact || 'N/A'}`,
      };

      const response = await apiClient.post('/gate-attendance', payload);
      
      setMessage('✓ Visitor entry logged successfully!');
      setLogs([response.data, ...logs]);
      setShowVisitorForm(false);

      setVisitorForm({
        visitorName: '',
        purpose: '',
        entryTime: new Date().toISOString().slice(0, 16),
        exitTime: '',
        contact: '',
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
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const staffLogs = logs.filter((log) => log.personType === 'Staff');
  const visitorLogs = logs.filter((log) => log.personType === 'Visitor');
  const displayLogs = activeTab === 'staff' ? staffLogs : visitorLogs;

  const handleDownloadExcel = () => {
    if (displayLogs.length === 0) {
      alert(`No ${activeTab} logs to download`);
      return;
    }

    let excelData;
    let fileName;
    let sheetName;

    if (activeTab === 'staff') {
      excelData = displayLogs.map((log) => ({
        'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '',
        'Employee Name': log.personName || '-',
        'Designation': log.designation || '-',
        'Entry Time': formatTime(log.entryTime),
        'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited',
        'Shift': log.shift || '-',
        'Notes': log.notes || '',
      }));
      fileName = `StaffGateAttendance_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheetName = 'Staff Entry/Exit';
    } else {
      excelData = displayLogs.map((log) => ({
        'Date': log.entryTime ? new Date(log.entryTime).toLocaleDateString('en-GB') : '',
        'Visitor Name': log.personName || '-',
        'Purpose': log.purpose || '-',
        'Entry Time': formatTime(log.entryTime),
        'Exit Time': log.exitTime ? formatTime(log.exitTime) : 'Not Exited',
        'Contact': log.contact || '-',
        'Notes': log.notes || '',
      }));
      fileName = `VisitorLog_${new Date().toISOString().slice(0, 10)}.xlsx`;
      sheetName = 'Visitor Log';
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 18 }, // Designation/Purpose
      { wch: 18 }, // Entry Time
      { wch: 18 }, // Exit Time
      { wch: 15 }, // Shift/Contact
      { wch: 25 }, // Notes
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Download file
    XLSX.writeFile(workbook, fileName);
    console.log('📥 Downloaded gate attendance to:', fileName);
  };

  // Only Guards can access this page
  if (user?.designation !== 'Guard') {
    return (
      <div className="gate-page">
        <h1>🚫 Access Denied</h1>
        <p>Only Guards can access the Gate Attendance page.</p>
      </div>
    );
  }

  return (
    <div className="gate-page">
      <h1>🚪 Gate Attendance & Visitor Log</h1>
      <p className="subtitle">Log staff entry/exit and visitor visits</p>

      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          Staff Entry/Exit
        </button>
        <button
          className={`tab-btn ${activeTab === 'visitor' ? 'active' : ''}`}
          onClick={() => setActiveTab('visitor')}
        >
          Visitor Log
        </button>
      </div>

      {activeTab === 'staff' && (
        <div className="section">
          <div className="section-buttons">
            <button
              className="btn-add"
              onClick={() => setShowStaffForm(!showStaffForm)}
            >
              {showStaffForm ? '✕ Cancel' : '+ Log Staff Entry/Exit'}
            </button>
            <button
              className="btn-download"
              onClick={handleDownloadExcel}
            >
              📥 Download Excel
            </button>
          </div>

          {showStaffForm && (
            <div className="form-container">
              <form onSubmit={handleStaffSubmit} className="gate-form">
                <div className="form-group">
                  <label htmlFor="employeeId">Employee *</label>
                  <select
                    id="employeeId"
                    value={staffForm.employeeId}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, employeeId: e.target.value })
                    }
                    required
                    disabled={loading}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="entryTime">Entry Time *</label>
                    <input
                      id="entryTime"
                      type="datetime-local"
                      value={staffForm.entryTime}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, entryTime: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exitTime">Exit Time</label>
                    <input
                      id="exitTime"
                      type="datetime-local"
                      value={staffForm.exitTime}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, exitTime: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="shift">Shift *</label>
                  <select
                    id="shift"
                    value={staffForm.shift}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, shift: e.target.value })
                    }
                    required
                    disabled={loading}
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    value={staffForm.notes}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, notes: e.target.value })
                    }
                    disabled={loading}
                    placeholder="Any additional notes"
                    rows={2}
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
                  {loading ? 'Logging...' : 'Log Entry'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'visitor' && (
        <div className="section">
          <div className="section-buttons">
            <button
              className="btn-add"
              onClick={() => setShowVisitorForm(!showVisitorForm)}
            >
              {showVisitorForm ? '✕ Cancel' : '+ Log Visitor'}
            </button>
            <button
              className="btn-download"
              onClick={handleDownloadExcel}
            >
              📥 Download Excel
            </button>
          </div>

          {showVisitorForm && (
            <div className="form-container">
              <form onSubmit={handleVisitorSubmit} className="gate-form">
                <div className="form-group">
                  <label htmlFor="visitorName">Visitor Name *</label>
                  <input
                    id="visitorName"
                    type="text"
                    value={visitorForm.visitorName}
                    onChange={(e) =>
                      setVisitorForm({
                        ...visitorForm,
                        visitorName: e.target.value,
                      })
                    }
                    required
                    disabled={loading}
                    placeholder="Enter visitor's full name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="purpose">Purpose of Visit *</label>
                  <input
                    id="purpose"
                    type="text"
                    value={visitorForm.purpose}
                    onChange={(e) =>
                      setVisitorForm({ ...visitorForm, purpose: e.target.value })
                    }
                    required
                    disabled={loading}
                    placeholder="e.g., Veterinary Checkup, Supplies"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact">Contact Number</label>
                  <input
                    id="contact"
                    type="tel"
                    value={visitorForm.contact}
                    onChange={(e) =>
                      setVisitorForm({ ...visitorForm, contact: e.target.value })
                    }
                    disabled={loading}
                    placeholder="Visitor's phone number (optional)"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="entryTime">Entry Time *</label>
                    <input
                      id="entryTime"
                      type="datetime-local"
                      value={visitorForm.entryTime}
                      onChange={(e) =>
                        setVisitorForm({
                          ...visitorForm,
                          entryTime: e.target.value,
                        })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exitTime">Exit Time</label>
                    <input
                      id="exitTime"
                      type="datetime-local"
                      value={visitorForm.exitTime}
                      onChange={(e) =>
                        setVisitorForm({
                          ...visitorForm,
                          exitTime: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    value={visitorForm.notes}
                    onChange={(e) =>
                      setVisitorForm({ ...visitorForm, notes: e.target.value })
                    }
                    disabled={loading}
                    placeholder="Any additional notes about the visit"
                    rows={2}
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
                  {loading ? 'Logging...' : 'Log Visitor'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Logs Table */}
      <div className="logs-container">
        <h2>
          {activeTab === 'staff' ? '👥 Staff Entry/Exit Logs' : '👤 Visitor Logs'}
        </h2>
        {displayLogs.length === 0 ? (
          <p className="no-data">No logs found</p>
        ) : (
          <table className="gate-table">
            <thead>
              <tr>
                {activeTab === 'staff' ? (
                  <>
                    <th>Employee</th>
                    <th>Entry Time</th>
                    <th>Exit Time</th>
                    <th>Shift</th>
                    <th>Duration</th>
                  </>
                ) : (
                  <>
                    <th>Visitor Name</th>
                    <th>Purpose</th>
                    <th>Entry Time</th>
                    <th>Exit Time</th>
                    <th>Contact</th>
                  </>
                )}
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {displayLogs.map((log) => (
                <tr key={log.id}>
                  {activeTab === 'staff' ? (
                    <>
                      <td>
                        <strong>{log.personName}</strong>
                      </td>
                      <td>{formatTime(log.entryTime)}</td>
                      <td>{formatTime(log.exitTime)}</td>
                      <td>{log.notes ? (log.notes.includes('Shift:') ? log.notes.split('\n')[0].replace('Shift: ', '') : '—') : '—'}</td>
                      <td>
                        {log.exitTime
                          ? `${Math.round((new Date(log.exitTime) - new Date(log.entryTime)) / 60000)} min`
                          : '—'}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{log.personName}</td>
                      <td>
                        {log.notes ? (
                          log.notes.split('\n').find((line) => line.includes('Purpose:'))?.replace('Purpose: ', '') || '—'
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{formatTime(log.entryTime)}</td>
                      <td>{formatTime(log.exitTime)}</td>
                      <td>
                        {log.notes ? (
                          log.notes.split('\n').find((line) => line.includes('Contact:'))?.replace('Contact: ', '') || '—'
                        ) : (
                          '—'
                        )}
                      </td>
                    </>
                  )}
                  <td>{log.notes ? log.notes.split('\n').slice(log.personType === 'Staff' ? 1 : 2).join('\n').trim() || '—' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GateAttendancePage;
