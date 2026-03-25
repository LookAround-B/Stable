import React, { useState, useEffect, useCallback } from 'react';
import InventoryCharts from '../components/InventoryCharts';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import feedInventoryService from '../services/feedInventoryService';
import { RotateCw, Download } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';

const FEED_LABELS = {
  balance: 'Himalayan Balance',
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
  const { t } = useI18n();
  const p = usePermissions();
  const { user } = useAuth();
  const isAdmin = ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'report'
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

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
      setCurrentPage(1); // Reset pagination
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

  // Pagination logic
  const totalPages = Math.ceil(inventoryRecords.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRecords = inventoryRecords.slice(startIndex, endIndex);

  const handleDownloadExcel = () => {
    if (!inventoryRecords.length) { alert('No data to download'); return; }
    const data = inventoryRecords.map(r => ({
      'Feed Type': FEED_LABELS[r.feedType] || r.feedType,
      'Opening Stock (kg)': r.openingStock,
      'Units Brought': r.unitsBrought,
      'Total Available': r.totalAvailable,
      'Used Today': r.usedToday,
      'Total Used': r.totalUsed,
      'Units Left': r.unitsLeft,
      'Unit': r.unit,
      'Month/Year': `${MONTH_NAMES[r.month - 1]} ${r.year}`,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Feed Inventory');
    XLSX.writeFile(wb, `FeedInventory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Threshold modal state (admin only)
  const [thresholdModal, setThresholdModal] = useState(null);

  const handleSaveThreshold = async () => {
    if (!thresholdModal) return;
    try {
      setLoading(true);
      await feedInventoryService.setThreshold(
        thresholdModal.record.id,
        thresholdModal.value === '' ? null : parseFloat(thresholdModal.value),
        thresholdModal.notifyAdmin
      );
      showMessage('Threshold updated');
      setThresholdModal(null);
      loadInventory();
    } catch {
      showMessage('Failed to update threshold', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!p.viewFeedInventory) return <Navigate to="/" replace />;

  return (
    <div className="feed-inventory-page">
      <div className="inventory-header">
        <h1>{t('Feed Inventory Management')}</h1>
        <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
      </div>

      {message && <div className={`message ${messageType}`}>{message}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Monthly Inventory
        </button>
        <button
          className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          Consumption Report
        </button>
      </div>

      {/* ========== INVENTORY TAB ========== */}
      {activeTab === 'inventory' && (
        <div className="inventory-section">
          {/* Month/Year Selector */}
          <div className="filters-section">
            <div className="filter-group" style={{minWidth: '160px'}}>
              <label>Month</label>
              <SearchableSelect
                name="month"
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                options={MONTH_NAMES.map((name, i) => ({ value: (i + 1).toString(), label: name }))}
                placeholder="Select month..."
              />
            </div>
            <div className="filter-group">
              <label>Year</label>
              <SearchableSelect
                name="year"
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                options={[2024, 2025, 2026, 2027].map((y) => ({ value: y.toString(), label: y.toString() }))}
                placeholder="Select year..."
              />
            </div>
            <div className="filter-actions">
              <button className="btn-primary" onClick={() => { resetForm(); setEditingRecord(null); setShowForm(!showForm); }} disabled={availableFeedTypes.length === 0 && !showForm}>
                {showForm ? 'Cancel' : '+ Add Stock Entry'}
              </button>
              <button className="btn-secondary" onClick={handleRecalculate} disabled={loading || inventoryRecords.length === 0}>
                <RotateCw size={16} style={{display: 'inline', marginRight: '6px'}} /> Recalculate Usage
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
                      <SearchableSelect
                        name="feedType"
                        value={formData.feedType}
                        onChange={(e) => setFormData({ ...formData, feedType: e.target.value })}
                        options={availableFeedTypes.map((ft) => ({ value: ft, label: FEED_LABELS[ft] }))}
                        placeholder="Select feed type..."
                        required
                      />
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
                    <SearchableSelect
                      name="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      options={[
                        { value: 'kg', label: 'Kilograms (kg)' },
                        { value: 'liters', label: 'Liters' },
                        { value: 'packets', label: 'Packets' },
                        { value: 'bags', label: 'Bags' },
                        { value: 'units', label: 'Units' },
                      ]}
                    />
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

          <InventoryCharts type="feed" records={inventoryRecords} labels={FEED_LABELS} />

          {inventoryRecords.some(r => r.threshold !== null && r.threshold !== undefined && r.notifyAdmin && r.unitsLeft < r.threshold) && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', padding: '10px 16px', borderRadius: '8px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
              ⚠️ <strong>Low stock alert:</strong> One or more feed inventory items are below their configured threshold.
            </div>
          )}

          {/* Inventory Table */}
          <div className="inventory-table-container">
            <h3>{MONTH_NAMES[selectedMonth - 1]} {selectedYear} - Feed Stock Status</h3>
            {loading ? (
              <div className="loading">Loading inventory...</div>
            ) : inventoryRecords.length === 0 ? (
              <div className="empty-state">
                <p>No inventory records for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.</p>
                <p>Click "Add Stock Entry" to start tracking feed inventory.</p>
              </div>
            ) : (
              <>
              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Feed Type</th>
                      <th>Opening Stock</th>
                      <th>Units Brought</th>
                      <th>Total Available</th>
                      <th>Used Today</th>
                      <th>Total Used</th>
                      <th>Units Left</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Threshold</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record) => {
                      const totalAvailable = record.openingStock + record.unitsBrought;
                      const percentUsed = totalAvailable > 0 ? (record.totalUsed / totalAvailable) * 100 : 0;
                      const isLow = record.unitsLeft < totalAvailable * 0.2;
                      const isEmpty = record.unitsLeft <= 0;
                      const isBelowThreshold = record.threshold !== null && record.threshold !== undefined && record.unitsLeft < record.threshold;

                      return (
                        <tr key={record.id} className={isEmpty ? 'row-danger' : isLow ? 'row-warning' : ''} style={isBelowThreshold ? { background: 'rgba(239,68,68,0.08)' } : {}}>
                          <td className="feed-name">{FEED_LABELS[record.feedType] || record.feedType}</td>
                          <td>{record.openingStock}</td>
                          <td>{record.unitsBrought}</td>
                          <td className="total-available">{totalAvailable}</td>
                          <td className={record.usedToday > 0 ? 'text-warning' : ''}>
                            {record.usedToday ?? 0}
                          </td>
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
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {record.threshold !== null && record.threshold !== undefined
                              ? <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{record.threshold} {record.unit}</span>
                              : <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>—</span>
                            }
                            {isBelowThreshold && <span style={{ marginLeft: 4, color: '#ef4444' }} title="Below threshold">⚠️</span>}
                          </td>
                          <td>
                            <button className="btn-sm btn-edit" onClick={() => handleEdit(record)}>Edit</button>
                            {isAdmin && (
                              <button
                                className="btn-sm"
                                style={{ marginLeft: 4, fontSize: '0.7rem', padding: '3px 8px', background: record.notifyAdmin ? 'rgba(245,158,11,0.15)' : 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '6px', cursor: 'pointer' }}
                                onClick={() => setThresholdModal({ record, value: record.threshold ?? '', notifyAdmin: record.notifyAdmin ?? false })}
                                title="Configure threshold alert"
                              >
                                🔔
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(newRows) => {
                    setRowsPerPage(newRows);
                    setCurrentPage(1);
                  }}
                  total={inventoryRecords.length}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ========== CONSUMPTION REPORT TAB ========== */}
      {activeTab === 'report' && (
        <div className="report-section">
          <div className="filters-section">
            <div className="filter-group" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <label>Start Date</label>
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
            </div>
            <div className="filter-group" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <label>End Date</label>
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
            </div>
            <div className="filter-actions">
              <button className="btn-primary" onClick={loadReport} disabled={loading}>
                  {loading ? 'Loading...' : 'Generate Report'}
              </button>
              {reportData && (
                <button className="btn-secondary" onClick={handleDownloadCSV} disabled={downloadingCSV}>
                  {downloadingCSV ? 'Downloading...' : '<Download size={14} />CSV'}
                </button>
              )}
            </div>
          </div>

          {reportData && (
            <>
              {/* Total Consumption Summary */}
              <div className="report-summary">
                <h3>Total Feed Consumption ({reportStartDate} to {reportEndDate})</h3>
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
                <h3>Horse-wise Consumption</h3>
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
                  <h3>Inventory Status for Period</h3>
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

      {thresholdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '12px', padding: '24px', width: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>Set Threshold Alert</h3>
            <p style={{ margin: '0 0 16px', opacity: 0.6, fontSize: '0.8rem' }}>{FEED_LABELS[thresholdModal.record.feedType] || thresholdModal.record.feedType}</p>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Threshold quantity ({thresholdModal.record.unit})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave empty to disable"
              value={thresholdModal.value}
              onChange={e => setThresholdModal(prev => ({ ...prev, value: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', marginBottom: '12px', boxSizing: 'border-box', background: 'var(--bg-input, #fff)', color: 'var(--text)' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '20px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={thresholdModal.notifyAdmin}
                onChange={e => setThresholdModal(prev => ({ ...prev, notifyAdmin: e.target.checked }))}
              />
              Notify admin when below threshold
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setThresholdModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveThreshold} disabled={loading}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedInventoryPage;

