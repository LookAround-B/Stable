import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/GateEntryRegisterPage.css';

const GateEntryRegisterPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [visitorsList, setVisitorsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('entry'); // 'entry' or 'exit'
  const [formData, setFormData] = useState({
    personType: 'Staff',
    employeeId: '',
    visitorId: '',
    newVisitorName: '',
    newVisitorPurpose: '',
    newVisitorPhone: '',
    notes: ''
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
      // Load gate entries for selected date
      const entriesResponse = await apiClient.get('/gate-entry/register', {
        params: { date: selectedDate }
      });
      setEntries(entriesResponse.data.entries || []);

      // Load staff list
      const staffResponse = await apiClient.get('/employees');
      setStaffList(staffResponse.data.data || []);

      // Load visitors list
      const visitorsResponse = await apiClient.get('/visitors');
      setVisitorsList(visitorsResponse.data.visitors || []);
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

  const handlePersonTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      personType: type,
      employeeId: '',
      visitorId: '',
      newVisitorName: '',
      newVisitorPurpose: '',
      newVisitorPhone: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (formData.personType === 'Staff' && !formData.employeeId) {
      setError('Please select a staff member');
      return;
    }

    if (formData.personType === 'Visitor') {
      if (!formData.visitorId && !formData.newVisitorName) {
        setError('Please select an existing visitor or provide visitor details');
        return;
      }
    }

    try {
      const endpoint = formMode === 'entry' ? '/gate-entry/entry' : '/gate-entry/exit';
      const payload = {
        personType: formData.personType,
        employeeId: formData.employeeId || null,
        visitorId: formData.visitorId || null,
        newVisitorName: formData.newVisitorName || null,
        newVisitorPurpose: formData.newVisitorPurpose || null,
        newVisitorPhone: formData.newVisitorPhone || null,
        notes: formData.notes
      };

      const response = await apiClient.post(endpoint, payload);
      
      setSuccessMessage(`${formMode === 'entry' ? 'Entry' : 'Exit'} recorded successfully`);
      
      // Reset form
      setFormData({
        personType: 'Staff',
        employeeId: '',
        visitorId: '',
        newVisitorName: '',
        newVisitorPurpose: '',
        newVisitorPhone: '',
        notes: ''
      });
      setShowForm(false);

      // Reload entries
      setTimeout(() => {
        loadData();
        setSuccessMessage('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to record ${formMode}`);
      console.error('Error:', err);
    }
  };

  const handleExit = async (entryId) => {
    if (!window.confirm('Are you sure you want to mark this entry as exited?')) return;

    try {
      await apiClient.post(`/gate-entry/${entryId}/exit`);
      setSuccessMessage('Exit recorded successfully');
      
      setTimeout(() => {
        loadData();
        setSuccessMessage('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record exit');
      console.error('Error:', err);
    }
  };

  const getStaffName = (staffId) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff ? staff.fullName : 'Unknown';
  };

  const getVisitorName = (visitorId) => {
    const visitor = visitorsList.find(v => v.id === visitorId);
    return visitor ? visitor.name : 'Unknown';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString();
  };

  const getTotalDuration = (entryTime, exitTime) => {
    if (!entryTime || !exitTime) return '-';
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    const diff = Math.floor((exit - entry) / 60000); // minutes
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="gate-entry-container">
      <div className="gate-header">
        <h2>Gate Entry/Exit Register</h2>
        <p className="subtitle">Recorded by Guard: {user?.fullName || 'Guard'}</p>
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

      <div className="gate-content">
        {/* Quick Entry Section */}
        <div className="entry-section">
          <div className="section-header">
            <h3>Record Entry/Exit</h3>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : '+ Record Entry/Exit'}
            </button>
          </div>

          {showForm && (
            <form className="gate-form" onSubmit={handleSubmit}>
              {/* Mode Selection */}
              <div className="mode-selection">
                <div className="mode-label">Operation Type:</div>
                <div className="mode-buttons">
                  <button
                    type="button"
                    className={`mode-btn ${formMode === 'entry' ? 'active' : ''}`}
                    onClick={() => setFormMode('entry')}
                  >
                    Entry
                  </button>
                  <button
                    type="button"
                    className={`mode-btn ${formMode === 'exit' ? 'active' : ''}`}
                    onClick={() => setFormMode('exit')}
                  >
                    Exit
                  </button>
                </div>
              </div>

              {/* Person Type Selection */}
              <div className="person-type-selection">
                <div className="type-label">Person Type:</div>
                <div className="type-buttons">
                  <button
                    type="button"
                    className={`type-btn ${formData.personType === 'Staff' ? 'active' : ''}`}
                    onClick={() => handlePersonTypeChange('Staff')}
                  >
                    Staff Member
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${formData.personType === 'Visitor' ? 'active' : ''}`}
                    onClick={() => handlePersonTypeChange('Visitor')}
                  >
                    Visitor
                  </button>
                </div>
              </div>

              {/* Staff Selection */}
              {formData.personType === 'Staff' && (
                <div className="form-group">
                  <label>Select Staff Member *</label>
                  <select 
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleFormChange}
                    className="form-input"
                    required
                  >
                    <option value="">-- Choose Staff --</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.fullName} ({staff.designation})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Visitor Selection */}
              {formData.personType === 'Visitor' && (
                <>
                  <div className="visitor-section">
                    <h4>Select Existing Visitor or Add New</h4>
                    
                    <div className="form-group">
                      <label>Existing Visitors</label>
                      <select 
                        name="visitorId"
                        value={formData.visitorId}
                        onChange={handleFormChange}
                        className="form-input"
                      >
                        <option value="">-- Select Visitor --</option>
                        {visitorsList.map(visitor => (
                          <option key={visitor.id} value={visitor.id}>
                            {visitor.name} ({visitor.purpose})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="divider">OR</div>

                    <div className="new-visitor-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Visitor Name *</label>
                          <input 
                            type="text" 
                            name="newVisitorName"
                            value={formData.newVisitorName}
                            onChange={handleFormChange}
                            placeholder="Full name"
                            className="form-input"
                          />
                        </div>

                        <div className="form-group">
                          <label>Contact Number</label>
                          <input 
                            type="tel" 
                            name="newVisitorPhone"
                            value={formData.newVisitorPhone}
                            onChange={handleFormChange}
                            placeholder="Phone number"
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Purpose of Visit *</label>
                        <input 
                          type="text" 
                          name="newVisitorPurpose"
                          value={formData.newVisitorPurpose}
                          onChange={handleFormChange}
                          placeholder="e.g., Delivery, Meeting, Inspection"
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              <div className="form-group">
                <label>Notes (Optional)</label>
                <input 
                  type="text" 
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Any additional notes"
                  className="form-input"
                />
              </div>

              <button type="submit" className={`btn ${formMode === 'entry' ? 'btn-success' : 'btn-warning'}`}>
                Record {formMode === 'entry' ? 'Entry' : 'Exit'}
              </button>
            </form>
          )}
        </div>

        {/* Register Log Section */}
        <div className="register-section">
          <div className="section-header">
            <h3>Today's Gate Register</h3>
            <div className="date-filter">
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
            <div className="loading">Loading gate entries...</div>
          ) : entries.length > 0 ? (
            <div className="register-table-wrapper">
              <table className="register-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Entry Time</th>
                    <th>Exit Time</th>
                    <th>Duration</th>
                    <th>Purpose/Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className={entry.exitTime ? 'exited' : 'active'}>
                      <td className="person-name">
                        {entry.personType === 'Staff' 
                          ? getStaffName(entry.employeeId)
                          : entry.visitor?.name || 'Visitor'
                        }
                      </td>
                      <td>
                        <span className={`person-badge ${entry.personType.toLowerCase()}`}>
                          {entry.personType}
                        </span>
                      </td>
                      <td>{formatTime(entry.entryTime)}</td>
                      <td>{formatTime(entry.exitTime)}</td>
                      <td>{getTotalDuration(entry.entryTime, entry.exitTime)}</td>
                      <td className="notes">
                        {entry.personType === 'Visitor' && entry.visitor 
                          ? entry.visitor.purpose 
                          : entry.notes || '-'
                        }
                      </td>
                      <td className="action-cell">
                        {!entry.exitTime && (
                          <button 
                            className="btn-small btn-exit"
                            onClick={() => handleExit(entry.id)}
                          >
                            Mark Exit
                          </button>
                        )}
                        {entry.exitTime && <span className="exited-text">Exited</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-entries">
              No gate entries recorded for {new Date(selectedDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GateEntryRegisterPage;
