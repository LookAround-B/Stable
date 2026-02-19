import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/HorseFeedsPage.css';

const HorseFeedsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [horses, setHorses] = useState([]);
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [summaryData, setSummaryData] = useState({});

  const feedTypes = ['balance', 'barley', 'oats', 'soya', 'lucerne', 'linseed', 'rOil', 'biotin', 'joint', 'epsom', 'heylase'];

  const [formData, setFormData] = useState({
    horseId: '',
    date: new Date().toISOString().split('T')[0],
    balance: '',
    barley: '',
    oats: '',
    soya: '',
    lucerne: '',
    linseed: '',
    rOil: '',
    biotin: '',
    joint: '',
    epsom: '',
    heylase: '',
    notes: '',
  });

  // Sync form date with toDate
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      date: toDate,
    }));
  }, [toDate]);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading horse feed summary for range:', fromDate, 'to', toDate);

      const response = await apiClient.get('/horse-feeds/summary', {
        params: {
          fromDate,
          toDate,
        },
      });

      console.log('Summary response:', response.data);
      setSummaryData(response.data.data || {});
      setMessage('');
    } catch (error) {
      console.error('Error loading summary:', error);
      setMessage('Failed to load summary');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  const loadHorses = useCallback(async () => {
    try {
      const response = await apiClient.get('/horses');
      console.log('Horses response:', response.data);
      setHorses(response.data.data || []);
    } catch (error) {
      console.error('Error loading horses:', error);
    }
  }, []);

  useEffect(() => {
    loadHorses();
    loadRecords();
  }, [loadHorses, loadRecords]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('success');

    if (!formData.horseId || !formData.date) {
      setMessage('Please fill in required fields (Horse and Date)');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);

      console.log('Submitting form data:', formData);

      const submitData = {
        horseId: formData.horseId,
        date: formData.date,
        balance: formData.balance ? parseFloat(formData.balance) : null,
        barley: formData.barley ? parseFloat(formData.barley) : null,
        oats: formData.oats ? parseFloat(formData.oats) : null,
        soya: formData.soya ? parseFloat(formData.soya) : null,
        lucerne: formData.lucerne ? parseFloat(formData.lucerne) : null,
        linseed: formData.linseed ? parseFloat(formData.linseed) : null,
        rOil: formData.rOil ? parseFloat(formData.rOil) : null,
        biotin: formData.biotin ? parseFloat(formData.biotin) : null,
        joint: formData.joint ? parseFloat(formData.joint) : null,
        epsom: formData.epsom ? parseFloat(formData.epsom) : null,
        heylase: formData.heylase ? parseFloat(formData.heylase) : null,
        notes: formData.notes,
      };

      console.log('Creating record with data:', submitData);

      await apiClient.post('/horse-feeds', submitData);
      setMessage('Feed record created successfully');
      setMessageType('success');

      setFormData({
        horseId: '',
        date: toDate,
        balance: '',
        barley: '',
        oats: '',
        soya: '',
        lucerne: '',
        linseed: '',
        rOil: '',
        biotin: '',
        joint: '',
        epsom: '',
        heylase: '',
        notes: '',
      });
      setShowForm(false);
      loadRecords();
    } catch (error) {
      console.error('Error creating record:', error);
      setMessage(error.response?.data?.error || 'Failed to create record');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !['Stable Manager', 'Ground Supervisor', 'Super Admin', 'Director', 'School Administrator'].includes(user.designation)) {
    return (
      <div className="page-container">
        <div className="error-message">
          You do not have permission to access this page. Only Stable Manager and Ground Supervisor can manage horse feeds.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🐴 Horse Feeds</h1>
        <p>Record daily feed consumption for horses</p>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      <div className="page-controls">
        <label>
          From Date:
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>

        <label>
          To Date:
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>

        {!showForm && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            ➕ Add Feed Record
          </button>
        )}
      </div>

      {showForm && (
        <div className="form-section">
          <div className="form-card">
            <h2>New Feed Record</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="horseId">Horse *</label>
                <select
                  id="horseId"
                  name="horseId"
                  value={formData.horseId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select a horse</option>
                  {horses.map((horse) => (
                    <option key={horse.id} value={horse.id}>
                      {horse.name} ({horse.stableNumber || 'No Stable #'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="date">Date *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="feed-inputs-grid">
                {feedTypes.map((feedType) => (
                  <div className="form-group" key={feedType}>
                    <label htmlFor={feedType}>
                      {feedType === 'rOil' ? 'R.Oil' : feedType.charAt(0).toUpperCase() + feedType.slice(1)}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      id={feedType}
                      name={feedType}
                      value={formData[feedType]}
                      onChange={handleFormChange}
                      placeholder="Amount (kg)"
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label htmlFor="notes">Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Any additional notes"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Record'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="summary-section">
        <div className="section-header">
          <h3>
            Feed Consumption Summary - {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}
          </h3>
        </div>

        {loading ? (
          <div className="loading">Loading summary...</div>
        ) : Object.keys(summaryData).length > 0 ? (
          <div className="summary-table-wrapper">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Horse</th>
                  <th>Stable Number</th>
                  <th>Balance</th>
                  <th>Barley</th>
                  <th>Oats</th>
                  <th>Soya</th>
                  <th>Lucerne</th>
                  <th>Linseed</th>
                  <th>R.Oil</th>
                  <th>Biotin</th>
                  <th>Joint</th>
                  <th>Epsom</th>
                  <th>Heylase</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summaryData).map(([horseId, data]) => {
                  const total = (
                    (data.balance || 0) +
                    (data.barley || 0) +
                    (data.oats || 0) +
                    (data.soya || 0) +
                    (data.lucerne || 0) +
                    (data.linseed || 0) +
                    (data.rOil || 0) +
                    (data.biotin || 0) +
                    (data.joint || 0) +
                    (data.epsom || 0) +
                    (data.heylase || 0)
                  ).toFixed(2);

                  return (
                    <tr key={horseId}>
                      <td className="horse-name">{data.horseName}</td>
                      <td>{data.stableNumber || '-'}</td>
                      <td>{data.balance ? data.balance.toFixed(2) : '-'}</td>
                      <td>{data.barley ? data.barley.toFixed(2) : '-'}</td>
                      <td>{data.oats ? data.oats.toFixed(2) : '-'}</td>
                      <td>{data.soya ? data.soya.toFixed(2) : '-'}</td>
                      <td>{data.lucerne ? data.lucerne.toFixed(2) : '-'}</td>
                      <td>{data.linseed ? data.linseed.toFixed(2) : '-'}</td>
                      <td>{data.rOil ? data.rOil.toFixed(2) : '-'}</td>
                      <td>{data.biotin ? data.biotin.toFixed(2) : '-'}</td>
                      <td>{data.joint ? data.joint.toFixed(2) : '-'}</td>
                      <td>{data.epsom ? data.epsom.toFixed(2) : '-'}</td>
                      <td>{data.heylase ? data.heylase.toFixed(2) : '-'}</td>
                      <td className="total">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-records">No feed data available for the selected date range</div>
        )}
      </div>
    </div>
  );
};

export default HorseFeedsPage;
