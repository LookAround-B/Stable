import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import '../styles/MedicineLogPage.css';

const MedicineLogPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [horses, setHorses] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'my', 'pending'

  const [formData, setFormData] = useState({
    horseId: '',
    medicineName: '',
    quantity: '',
    unit: 'ml', // ml, g, tablets, etc.
    timeAdministered: new Date().toISOString().slice(0, 16),
    notes: '',
    photoUrl: '',
  });

  const UNITS = ['ml', 'g', 'tablets', 'drops', 'injections', 'ointment (g)'];

  useEffect(() => {
    loadMedicineLogs();
    loadHorses();
  }, []);

  const loadMedicineLogs = async () => {
    try {
      const response = await apiClient.get('/medicine-logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Error loading medicine logs:', error);
    }
  };

  const loadHorses = async () => {
    try {
      const response = await apiClient.get('/horses');
      setHorses(response.data);
    } catch (error) {
      console.error('Error loading horses:', error);
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
      if (!formData.horseId || !formData.medicineName || !formData.quantity) {
        throw new Error('Please fill in all required fields');
      }

      const payload = {
        horseId: formData.horseId,
        medicineName: formData.medicineName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        timeAdministered: new Date(formData.timeAdministered),
        notes: formData.notes || null,
        photoUrl: formData.photoUrl || null,
      };

      const response = await apiClient.post('/medicine-logs', payload);
      
      setMessage('✓ Medicine log created successfully!');
      setLogs([response.data, ...logs]);
      setShowForm(false);

      setFormData({
        horseId: '',
        medicineName: '',
        quantity: '',
        unit: 'ml',
        timeAdministered: new Date().toISOString().slice(0, 16),
        notes: '',
        photoUrl: '',
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

  const getFilteredLogs = () => {
    switch (filter) {
      case 'my':
        return logs.filter((log) => log.jamedarId === user?.id);
      case 'pending':
        return logs.filter((log) => !log.isApproved);
      default:
        return logs;
    }
  };

  const filteredLogs = getFilteredLogs();

  // Only Jamedar can access this page
  if (user?.designation !== 'Jamedar') {
    return (
      <div className="medicine-page">
        <h1>🚫 Access Denied</h1>
        <p>Only Jamedar can access the Medicine Log page.</p>
      </div>
    );
  }

  return (
    <div className="medicine-page">
      <h1>💊 Medicine Administration Log</h1>
      <p className="subtitle">
        Track all medicine administered to horses
      </p>

      <button
        className="btn-add"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? '✕ Cancel' : '+ Log Medicine'}
      </button>

      {/* Medicine Form */}
      {showForm && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="medicine-form">
            <div className="form-group">
              <label htmlFor="horseId">Horse *</label>
              <SearchableSelect
                id="horseId"
                name="horseId"
                value={formData.horseId}
                onChange={handleInputChange}
                placeholder="-- Select Horse --"
                required
                disabled={loading}
                options={[
                  { value: '', label: '-- Select Horse --' },
                  ...horses.map(h => ({ value: h.id, label: `${h.name} (ID: ${h.registrationNumber})` }))
                ]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="medicineName">Medicine Name *</label>
              <input
                id="medicineName"
                type="text"
                name="medicineName"
                value={formData.medicineName}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="e.g., Penicillin, Vitamin B12, Aspirin"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">Quantity *</label>
                <input
                  id="quantity"
                  type="number"
                  name="quantity"
                  step="0.01"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Amount given"
                />
              </div>

              <div className="form-group">
                <label htmlFor="unit">Unit *</label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="timeAdministered">Time Administered *</label>
              <input
                id="timeAdministered"
                type="datetime-local"
                name="timeAdministered"
                value={formData.timeAdministered}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Clinical Notes & Observations</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="Describe the horse's condition, reason for medicine, observed effects, etc."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="photoUrl">Photo URL (Evidence)</label>
              <input
                id="photoUrl"
                type="url"
                name="photoUrl"
                value={formData.photoUrl}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="https://example.com/photo.jpg"
              />
              <small>Upload a photo of medicine bottle or administration</small>
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
              {loading ? 'Logging...' : 'Log Medicine'}
            </button>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Logs ({logs.length})
        </button>
        <button
          className={`filter-btn ${filter === 'my' ? 'active' : ''}`}
          onClick={() => setFilter('my')}
        >
          My Logs
        </button>
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending Approval ({logs.filter((l) => !l.isApproved).length})
        </button>
      </div>

      {/* Medicine Logs Table */}
      <div className="logs-container">
        <h2>Medicine Administration Records</h2>
        {filteredLogs.length === 0 ? (
          <p className="no-data">No medicine logs found</p>
        ) : (
          <table className="medicine-table">
            <thead>
              <tr>
                <th>Horse</th>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Time Administered</th>
                <th>Jamedar</th>
                <th>Notes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className={log.isApproved ? 'approved' : 'pending'}>
                  <td>
                    <strong>{log.horse.name}</strong>
                    <br />
                    <small>{log.horse.registrationNumber}</small>
                  </td>
                  <td>
                    <strong>{log.medicineName}</strong>
                    <br />
                    <small>{log.quantity} {log.unit}</small>
                  </td>
                  <td>
                    {log.quantity} {log.unit}
                  </td>
                  <td>{formatTime(log.timeAdministered)}</td>
                  <td>{log.jamedar.fullName}</td>
                  <td>
                    {log.notes ? (
                      <span title={log.notes}>{log.notes.substring(0, 30)}...</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${log.isApproved ? 'approved' : 'pending'}`}
                    >
                      {log.isApproved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stock Alert Section */}
      <div className="alerts-container">
        <h2>🚨 Stock Alerts</h2>
        <div className="alert-info">
          <p>
            Medicine logs with stock levels below 20 units will show alerts here.
            Check with Stable Manager for replenishment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MedicineLogPage;
