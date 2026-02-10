import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import '../styles/DailyWorkRecordsPage.css';

const DailyWorkRecordsPage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [formData, setFormData] = useState({
    horseId: '',
    riderId: '',
    workType: 'Lesson',
    duration: '',
    date: selectedDate,
    notes: '',
  });

  const workTypes = ['Lesson', 'Training', 'Exercise', 'Rehab', 'Groundwork', 'Lunge', 'Hack'];

  // Load records
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = new Date(selectedDate);
      startDate.setDate(startDate.getDate());
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);

      const response = await apiClient.get('/eirs', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        },
      });

      setRecords(response.data.data || []);
      setMessage('');
    } catch (error) {
      console.error('Error loading records:', error);
      setMessage('Failed to load records');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Load horses and employees
  const loadHorsesAndEmployees = async () => {
    try {
      const [horsesRes, employeesRes] = await Promise.all([
        apiClient.get('/horses'),
        apiClient.get('/employees'),
      ]);

      setHorses(horsesRes.data.data || []);
      setEmployees(employeesRes.data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadRecords();
    loadHorsesAndEmployees();
  }, [selectedDate, loadRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setFormData((prev) => ({
      ...prev,
      date: newDate,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.horseId || !formData.riderId || !formData.duration) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);

      if (editingId) {
        // Update record
        await apiClient.put(`/eirs/${editingId}`, {
          ...formData,
          duration: parseInt(formData.duration),
        });
        setMessage('Record updated successfully');
      } else {
        // Create new record
        await apiClient.post('/eirs', {
          ...formData,
          duration: parseInt(formData.duration),
        });
        setMessage('Record created successfully');
      }

      setMessageType('success');
      setFormData({
        horseId: '',
        riderId: '',
        workType: 'Lesson',
        duration: '',
        date: selectedDate,
        notes: '',
      });
      setEditingId(null);
      setShowForm(false);
      loadRecords();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to save record');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setFormData({
      horseId: record.horseId,
      riderId: record.riderId,
      workType: record.workType,
      duration: record.duration.toString(),
      date: record.date.split('T')[0],
      notes: record.notes || '',
    });
    setEditingId(record.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      setLoading(true);
      await apiClient.delete(`/eirs/${id}`);
      setMessage('Record deleted successfully');
      setMessageType('success');
      loadRecords();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to delete record');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      horseId: '',
      riderId: '',
      workType: 'Lesson',
      duration: '',
      date: selectedDate,
      notes: '',
    });
  };

  return (
    <div className="daily-work-records-page">
      <h1>Daily Work Records (EIRS)</h1>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
          <button onClick={() => setMessage('')} className="close-btn">✕</button>
        </div>
      )}

      <div className="page-controls">
        <label>
          Select Date:
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>

        {!showForm && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            + New Record
          </button>
        )}
      </div>

      {showForm && (
        <div className="form-container">
          <div className="form-card">
            <h2>{editingId ? 'Edit Work Record' : 'New Work Record'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleDateChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="horseId">Horse *</label>
                <select
                  id="horseId"
                  name="horseId"
                  value={formData.horseId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a horse</option>
                  {horses.map((horse) => (
                    <option key={horse.id} value={horse.id}>
                      {horse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="riderId">Rider/Student *</label>
                <select
                  id="riderId"
                  name="riderId"
                  value={formData.riderId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a rider</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="workType">Type of Work *</label>
                  <select
                    id="workType"
                    name="workType"
                    value={formData.workType}
                    onChange={handleInputChange}
                    required
                  >
                    {workTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="duration">Duration (minutes) *</label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    placeholder="45"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes about the session"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="records-list">
        <h2>Records for {new Date(selectedDate).toLocaleDateString()}</h2>

        {loading && <div className="loading">Loading...</div>}

        {!loading && records.length === 0 && (
          <div className="no-records">No records for this date</div>
        )}

        {!loading && records.length > 0 && (
          <div className="records-table">
            <table>
              <thead>
                <tr>
                  <th>Horse</th>
                  <th>Rider</th>
                  <th>Type</th>
                  <th>Duration (min)</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.horse.name}</td>
                    <td>{record.rider.fullName}</td>
                    <td>{record.workType}</td>
                    <td>{record.duration}</td>
                    <td>{record.notes || '-'}</td>
                    <td className="actions">
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() => handleEdit(record)}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(record.id)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyWorkRecordsPage;
