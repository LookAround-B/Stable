import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import medicineInventoryService from '../services/medicineInventoryService';
import '../styles/MedicineInventoryPage.css';

const MEDICINE_LABELS = {
  antibiotic: 'Antibiotic',
  antiseptic: 'Antiseptic',
  painkiller: 'Painkiller',
  vitamin: 'Vitamin',
  dewormer: 'Dewormer',
  injection: 'Injection',
  ointment: 'Ointment',
  supplement: 'Supplement',
};

const MEDICINE_TYPES = Object.keys(MEDICINE_LABELS);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MedicineInventoryPage = () => {
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
    medicineType: '',
    unitsPurchased: '',
    openingStock: '',
    unit: 'ml',
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
      const result = await medicineInventoryService.getInventory({
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
        await medicineInventoryService.updateInventory({
          id: editingRecord.id,
          unitsPurchased: formData.unitsPurchased,
          openingStock: formData.openingStock,
          unit: formData.unit,
          notes: formData.notes,
        });
        showMessage('Inventory record updated successfully');
      } else {
        await medicineInventoryService.createInventory({
          medicineType: formData.medicineType,
          month: selectedMonth,
          year: selectedYear,
          unitsPurchased: formData.unitsPurchased,
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
      medicineType: record.medicineType,
      unitsPurchased: record.unitsPurchased.toString(),
      openingStock: record.openingStock.toString(),
      unit: record.unit,
      notes: record.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        setLoading(true);
        await medicineInventoryService.deleteInventory(id);
        showMessage('Record deleted successfully');
        loadInventory();
      } catch (error) {
        showMessage('Failed to delete record', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      medicineType: '',
      unitsPurchased: '',
      openingStock: '',
      unit: 'ml',
      notes: '',
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    resetForm();
  };

  const handleLoadReport = async () => {
    try {
      setLoading(true);
      const result = await medicineInventoryService.getReport(reportStartDate, reportEndDate);
      setReportData(result.data || {});
    } catch (error) {
      showMessage('Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      setDownloadingCSV(true);
      const blob = await medicineInventoryService.downloadReport(reportStartDate, reportEndDate);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medicine-inventory-report-${reportStartDate}-to-${reportEndDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showMessage('Failed to download report', 'error');
    } finally {
      setDownloadingCSV(false);
    }
  };

  const totalOpeningStock = inventoryRecords.reduce((sum, record) => sum + (record.openingStock || 0), 0);
  const totalPurchased = inventoryRecords.reduce((sum, record) => sum + (record.unitsPurchased || 0), 0);

  if (!user || !['Stable Manager', 'Super Admin', 'Director', 'School Administrator', 'Jamedar'].includes(user.designation)) {
    return (
      <div className="page-container">
        <div className="error-message">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💊 Medicine Inventory</h1>
        <p>Manage and track medicine stock levels</p>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventory
        </button>
        <button
          className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          📊 Report
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="inventory-section">
          <div className="month-selector">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((month, idx) => (
                <option key={idx} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => !showForm && setShowForm(true)} disabled={loading || showForm}>
              + Add Record
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="inventory-form">
              <div className="form-group">
                <label>Medicine Type *</label>
                <select
                  name="medicineType"
                  value={formData.medicineType}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData((prev) => ({ ...prev, [name]: value }));
                  }}
                  disabled={editingRecord !== null}
                  required
                >
                  <option value="">Select Medicine Type</option>
                  {MEDICINE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {MEDICINE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Opening Stock (units)</label>
                <input
                  type="number"
                  name="openingStock"
                  value={formData.openingStock}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData((prev) => ({ ...prev, [name]: value }));
                  }}
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Units Purchased</label>
                <input
                  type="number"
                  name="unitsPurchased"
                  value={formData.unitsPurchased}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData((prev) => ({ ...prev, [name]: value }));
                  }}
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData((prev) => ({ ...prev, [name]: value }));
                  }}
                >
                  <option value="ml">ml</option>
                  <option value="g">g</option>
                  <option value="tablets">tablets</option>
                  <option value="bottles">bottles</option>
                  <option value="vials">vials</option>
                  <option value="boxes">boxes</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData((prev) => ({ ...prev, [name]: value }));
                  }}
                  placeholder="Additional notes..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingRecord ? 'Update Record' : 'Create Record'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleCancel} disabled={loading}>
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="summary-section">
            <div className="summary-card">
              <h3>Total Opening Stock</h3>
              <p className="summary-value">{totalOpeningStock}</p>
            </div>
            <div className="summary-card">
              <h3>Total Purchased</h3>
              <p className="summary-value">{totalPurchased}</p>
            </div>
            <div className="summary-card">
              <h3>Records</h3>
              <p className="summary-value">{inventoryRecords.length}</p>
            </div>
          </div>

          {loading && <div className="loading">Loading...</div>}

          {!loading && inventoryRecords.length > 0 ? (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Medicine Type</th>
                  <th>Opening Stock</th>
                  <th>Units Purchased</th>
                  <th>Unit</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventoryRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{MEDICINE_LABELS[record.medicineType]}</td>
                    <td>{record.openingStock}</td>
                    <td>{record.unitsPurchased}</td>
                    <td>{record.unit}</td>
                    <td>{record.notes}</td>
                    <td className="actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(record)}
                        disabled={loading || showForm}
                      >
                        ✎ Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(record.id)}
                        disabled={loading || showForm}
                      >
                        ✕ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            !loading && <p className="no-data">No inventory records for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
          )}
        </div>
      )}

      {activeTab === 'report' && (
        <div className="report-section">
          <div className="report-controls">
            <div className="date-range">
              <label>Start Date:</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              />
              <label>End Date:</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              />
            </div>
            <div className="report-actions">
              <button className="btn-primary" onClick={handleLoadReport} disabled={loading}>
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
              <button
                className="btn-secondary"
                onClick={handleDownloadCSV}
                disabled={downloadingCSV || !reportData}
              >
                {downloadingCSV ? 'Downloading...' : '⬇ Download CSV'}
              </button>
            </div>
          </div>

          {reportData && Object.keys(reportData).length > 0 ? (
            <div className="report-data">
              <h3>Medicine Inventory Report</h3>
              <p className="report-date-range">
                {reportStartDate} to {reportEndDate}
              </p>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Medicine Type</th>
                    <th>Opening Stock</th>
                    <th>Units Purchased</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData).map(([type, data]) => (
                    <tr key={type}>
                      <td>{MEDICINE_LABELS[type]}</td>
                      <td>{data.openingStock || 0}</td>
                      <td>{data.unitsPurchased || 0}</td>
                      <td>{(data.openingStock || 0) + (data.unitsPurchased || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loading && reportData && <p className="no-data">No data for selected date range</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MedicineInventoryPage;
