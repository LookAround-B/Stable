import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import feedInventoryService from '../services/feedInventoryService';
import '../styles/FeedInventoryPage.css';

const FEED_LABELS = {
  balance: 'Balance',
  barley: 'Barley',
  oats: 'Oats',
  soya: 'Soya',
  lucerne: 'Lucerne',
  linseed: 'Linseed',
  rOil: 'R.Oil',
  biotin: 'Biotin',
  joint: 'Joint',
  epsom: 'Epsom',
  heylase: 'Heylase',
};

const FEED_TYPES = Object.keys(FEED_LABELS);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const FeedInventoryPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'report'

  // Inventory state
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    feedType: '',
    unitsBrought: '',
    openingStock: '',
    unit: 'kg',
    notes: '',
  });

  // Report state
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const result = await feedInventoryService.getInventory({
        month: selectedMonth,
        year: selectedYear,
      });
      setInventoryRecords(result.data || []);
    } catch (error) {
      showMessage('Failed to load inventory records', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventory();
    }
  }, [activeTab, loadInventory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingRecord) {
        await feedInventoryService.updateInventory({
          id: editingRecord.id,
          unitsBrought: formData.unitsBrought,
          openingStock: formData.openingStock,
          unit: formData.unit,
          notes: formData.notes,
        });
        showMessage('Inventory record updated successfully');
      } else {
        await feedInventoryService.createInventory({
          feedType: formData.feedType,
          month: selectedMonth,
          year: selectedYear,
          unitsBrought: formData.unitsBrought,
          openingStock: formData.openingStock,
          unit: formData.unit,
          notes: formData.notes,
        });
        showMessage('Inventory record created successfully');
      }
      setShowForm(false);
      setEditingRecord(null);
      resetForm();
      loadInventory();
    } catch (error) {
      showMessage(error.error || 'Failed to save inventory record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      feedType: record.feedType,
      unitsBrought: record.unitsBrought.toString(),
      openingStock: record.openingStock.toString(),
      unit: record.unit,
      notes: record.notes || '',
    });
    setShowForm(true);
  };

  const handleRecalculate = async () => {
    try {
      setLoading(true);
      const result = await feedInventoryService.recalculate(selectedMonth, selectedYear);
      showMessage(result.message || 'Usage recalculated successfully');
      loadInventory();
    } catch (error) {
      showMessage(error.error || 'Failed to recalculate usage', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ feedType: '', unitsBrought: '', openingStock: '', unit: 'kg', notes: '' });
  };

  // Get feed types that don't have records yet for the selected month
  const availableFeedTypes = FEED_TYPES.filter(
    (ft) => !inventoryRecords.some((r) => r.feedType === ft)
  );

  // === Report Functions ===
  const loadReport = async () => {
    try {
      setLoading(true);
      const result = await feedInventoryService.getConsumptionReport(reportStartDate, reportEndDate);
      setReportData(result.data);
    } catch (error) {
      showMessage('Failed to load consumption report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      setDownloadingCSV(true);
      await feedInventoryService.downloadConsumptionCSV(reportStartDate, reportEndDate);
      showMessage('CSV report downloaded successfully');
    } catch (error) {
      showMessage('Failed to download CSV report', 'error');
    } finally {
      setDownloadingCSV(false);
    }
  };

  const isAuthorized = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Ground Supervisor'].includes(user?.designation);

  if (!isAuthorized) {
    return (
      <div className="feed-inventory-page">
        <h1>Feed Inventory</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="feed-inventory-page">
      <div className="inventory-header">
        <h1>📦 Feed Inventory Management</h1>
      </div>

      {message && <div className={`message ${messageType}`}>{message}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Monthly Inventory
        </button>
        <button
          className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          📊 Consumption Report
        </button>
      </div>

      {/* ========== INVENTORY TAB ========== */}
      {activeTab === 'inventory' && (
        <div className="inventory-section">
          {/* Month/Year Selector */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Month</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Year</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="filter-actions">
              <button className="btn-primary" onClick={() => { resetForm(); setEditingRecord(null); setShowForm(!showForm); }} disabled={availableFeedTypes.length === 0 && !showForm}>
                {showForm ? 'Cancel' : '+ Add Stock Entry'}
              </button>
              <button className="btn-secondary" onClick={handleRecalculate} disabled={loading || inventoryRecords.length === 0}>
                🔄 Recalculate Usage
              </button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="inventory-form-section">
              <h3>{editingRecord ? `Edit: ${FEED_LABELS[editingRecord.feedType]}` : 'Add Stock Entry'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  {!editingRecord && (
                    <div className="form-group">
                      <label>Feed Type *</label>
                      <select
                        value={formData.feedType}
                        onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
                        required
                      >
                        <option value="">Select feed type...</option>
                        {availableFeedTypes.map((ft) => (
                          <option key={ft} value={ft}>{FEED_LABELS[ft]}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Opening Stock</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.openingStock}
                      onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Units Brought *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitsBrought}
                      onChange={(e) => setFormData({ ...formData, unitsBrought: e.target.value })}
                      required
                      placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="liters">Liters</option>
                      <option value="packets">Packets</option>
                      <option value="bags">Bags</option>
                      <option value="units">Units</option>
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional notes..."
                      rows={2}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : editingRecord ? 'Update' : 'Create'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); setEditingRecord(null); resetForm(); }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Inventory Table */}
          <div className="inventory-table-container">
            <h3>📋 {MONTH_NAMES[selectedMonth - 1]} {selectedYear} - Feed Stock Status</h3>
            {loading ? (
              <div className="loading">Loading inventory...</div>
            ) : inventoryRecords.length === 0 ? (
              <div className="empty-state">
                <p>No inventory records for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.</p>
                <p>Click "Add Stock Entry" to start tracking feed inventory.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Feed Type</th>
                      <th>Opening Stock</th>
                      <th>Units Brought</th>
                      <th>Total Available</th>
                      <th>Total Used</th>
                      <th>Units Left</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryRecords.map((record) => {
                      const totalAvailable = record.openingStock + record.unitsBrought;
                      const percentUsed = totalAvailable > 0 ? (record.totalUsed / totalAvailable) * 100 : 0;
                      const isLow = record.unitsLeft < totalAvailable * 0.2;
                      const isEmpty = record.unitsLeft <= 0;

                      return (
                        <tr key={record.id} className={isEmpty ? 'row-danger' : isLow ? 'row-warning' : ''}>
                          <td className="feed-name">{FEED_LABELS[record.feedType] || record.feedType}</td>
                          <td>{record.openingStock}</td>
                          <td>{record.unitsBrought}</td>
                          <td className="total-available">{totalAvailable}</td>
                          <td>{record.totalUsed}</td>
                          <td className={`units-left ${isEmpty ? 'text-danger' : isLow ? 'text-warning' : 'text-success'}`}>
                            {record.unitsLeft}
                          </td>
                          <td>{record.unit}</td>
                          <td>
                            <div className="usage-bar">
                              <div
                                className={`usage-fill ${percentUsed > 80 ? 'danger' : percentUsed > 50 ? 'warning' : 'normal'}`}
                                style={{ width: `${Math.min(100, percentUsed)}%` }}
                              />
                            </div>
                            <span className="usage-percent">{percentUsed.toFixed(1)}% used</span>
                          </td>
                          <td>
                            <button className="btn-sm btn-edit" onClick={() => handleEdit(record)}>✏️ Edit</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== CONSUMPTION REPORT TAB ========== */}
      {activeTab === 'report' && (
        <div className="report-section">
          <div className="filters-section">
            <div className="filter-group">
              <label>Start Date</label>
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
            </div>
            <div className="filter-actions">
              <button className="btn-primary" onClick={loadReport} disabled={loading}>
                {loading ? 'Loading...' : '📊 Generate Report'}
              </button>
              {reportData && (
                <button className="btn-secondary" onClick={handleDownloadCSV} disabled={downloadingCSV}>
                  {downloadingCSV ? 'Downloading...' : '📥 Download CSV'}
                </button>
              )}
            </div>
          </div>

          {reportData && (
            <>
              {/* Total Consumption Summary */}
              <div className="report-summary">
                <h3>📊 Total Feed Consumption ({reportStartDate} to {reportEndDate})</h3>
                <div className="summary-cards">
                  {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                    <div key={ft} className="summary-card">
                      <div className="card-label">{FEED_LABELS[ft]}</div>
                      <div className="card-value">{reportData.totalConsumption[ft]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-Horse Consumption Table */}
              <div className="inventory-table-container">
                <h3>🐴 Horse-wise Consumption</h3>
                <div className="table-wrapper">
                  <table className="inventory-table consumption-table">
                    <thead>
                      <tr>
                        <th>Horse</th>
                        <th>Stable No</th>
                        <th>Days</th>
                        {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                          <th key={ft}>{FEED_LABELS[ft]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.horseConsumption).map(([horseId, hc]) => (
                        <tr key={horseId}>
                          <td className="feed-name">{hc.horseName}</td>
                          <td>{hc.stableNumber || '-'}</td>
                          <td>{hc.daysRecorded}</td>
                          {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                            <td key={ft}>{hc.feeds[ft] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td></td>
                        <td></td>
                        {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                          <td key={ft}><strong>{reportData.totalConsumption[ft]}</strong></td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inventory Status */}
              {reportData.inventory && reportData.inventory.length > 0 && (
                <div className="inventory-table-container">
                  <h3>📦 Inventory Status for Period</h3>
                  <div className="table-wrapper">
                    <table className="inventory-table">
                      <thead>
                        <tr>
                          <th>Feed Type</th>
                          <th>Month/Year</th>
                          <th>Opening Stock</th>
                          <th>Units Brought</th>
                          <th>Total Used</th>
                          <th>Units Left</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.inventory.map((inv) => (
                          <tr key={inv.id}>
                            <td className="feed-name">{FEED_LABELS[inv.feedType] || inv.feedType}</td>
                            <td>{MONTH_NAMES[inv.month - 1]} {inv.year}</td>
                            <td>{inv.openingStock}</td>
                            <td>{inv.unitsBrought}</td>
                            <td>{inv.totalUsed}</td>
                            <td className={inv.unitsLeft <= 0 ? 'text-danger' : inv.unitsLeft < (inv.openingStock + inv.unitsBrought) * 0.2 ? 'text-warning' : 'text-success'}>
                              {inv.unitsLeft}
                            </td>
                            <td>{inv.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedInventoryPage;
