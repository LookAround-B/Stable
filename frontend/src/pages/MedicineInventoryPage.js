import React, { useState, useEffect, useCallback } from 'react';
import { TableSkeleton } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import medicineInventoryService from '../services/medicineInventoryService';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [medicineSearch, setMedicineSearch] = useState('');
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

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  // Sort state
  const [sortKey, setSortKey] = useState('medicineType'); // 'medicineType' | 'unitsLeft'
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  // Threshold modal state (admin only)
  const [thresholdModal, setThresholdModal] = useState(null); // { record, value, notifyAdmin }

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setCurrentPage(1); // Reset pagination
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

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
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
      // Fetch all records and filter client-side by date range (inventory stored by month/year)
      const result = await medicineInventoryService.getInventory();
      const allRecords = result?.data || [];

      const start = new Date(reportStartDate);
      const end = new Date(reportEndDate);
      const startYear = start.getFullYear();
      const startMonth = start.getMonth() + 1;
      const endYear = end.getFullYear();
      const endMonth = end.getMonth() + 1;

      const filtered = allRecords.filter(rec => {
        const recYear = rec.year;
        const recMonth = rec.month;
        const afterStart = recYear > startYear || (recYear === startYear && recMonth >= startMonth);
        const beforeEnd = recYear < endYear || (recYear === endYear && recMonth <= endMonth);
        return afterStart && beforeEnd;
      });

      // Group by medicineType and aggregate
      const grouped = {};
      filtered.forEach(rec => {
        if (!grouped[rec.medicineType]) {
          grouped[rec.medicineType] = { openingStock: 0, unitsPurchased: 0, totalUsed: 0, unitsLeft: 0, unit: rec.unit };
        }
        grouped[rec.medicineType].openingStock += rec.openingStock || 0;
        grouped[rec.medicineType].unitsPurchased += rec.unitsPurchased || 0;
        grouped[rec.medicineType].totalUsed += rec.totalUsed || 0;
        grouped[rec.medicineType].unitsLeft += rec.unitsLeft || 0;
      });

      setReportData(grouped);
      if (Object.keys(grouped).length === 0) {
        showMessage('No inventory data found for the selected date range', 'info');
      }
    } catch (error) {
      console.error('Report error:', error);
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

  // Filter by search term
  const filteredInventory = inventoryRecords.filter(record => {
    const medicineLabel = (MEDICINE_LABELS[record.medicineType] || record.medicineType).toLowerCase();
    return medicineLabel.includes(medicineSearch.toLowerCase());
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredInventory.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRecords = filteredInventory.slice(startIndex, endIndex);

  // Sort records
  const sortedPaginated = [...paginatedRecords].sort((a, b) => {
    if (sortKey === 'medicineType') {
      const nameA = (MEDICINE_LABELS[a.medicineType] || a.medicineType).toLowerCase();
      const nameB = (MEDICINE_LABELS[b.medicineType] || b.medicineType).toLowerCase();
      return sortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    if (sortKey === 'unitsLeft') {
      return sortDir === 'asc' ? (a.unitsLeft || 0) - (b.unitsLeft || 0) : (b.unitsLeft || 0) - (a.unitsLeft || 0);
    }
    return 0;
  });
  const sortedRecords = sortedPaginated;

  const handleDownloadExcel = () => {
    if (!filteredInventory.length) { alert('No data to download'); return; }
    const data = filteredInventory.map(r => ({
      'Medicine Type': MEDICINE_LABELS[r.medicineType] || r.medicineType,
      'Opening Stock': r.openingStock,
      'Units Purchased': r.unitsPurchased,
      'Total Used': r.totalUsed,
      'Units Left': r.unitsLeft,
      'Unit': r.unit,
      'Notes': r.notes || '',
      'Month/Year': `${MONTH_NAMES[r.month - 1]} ${r.year}`,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Medicine Inventory');
    XLSX.writeFile(wb, `MedicineInventory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleSaveThreshold = async () => {
    if (!thresholdModal) return;
    try {
      setLoading(true);
      await medicineInventoryService.setThreshold(
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

  if (!p.viewMedicineInventory) return <Navigate to="/" replace />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{t('Medicine Inventory')}</h1>
          <p>Manage and track medicine stock levels</p>
        </div>
        <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
      </div>
      
      <div className="search-bar" style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', color: '#999', pointerEvents: 'none', zIndex: 1 }} />
        <input
          type="text"
          placeholder={t("Search medicine name...")}
          value={medicineSearch}
          onChange={(e) => {
            setMedicineSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="search-input"
          style={{ paddingLeft: '40px' }}
        />
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
          Inventory
        </button>
        <button
          className={`tab-button ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          Report
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="inventory-section">
          <div className="month-selector">
            <SearchableSelect
              value={selectedMonth.toString()}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              options={MONTH_NAMES.map((month, idx) => ({ value: (idx + 1).toString(), label: month }))}
              placeholder="Select month..."
            />
            <SearchableSelect
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              options={[2023, 2024, 2025, 2026, 2027].map((year) => ({ value: year.toString(), label: year.toString() }))}
              placeholder="Select year..."
            />
            <button className="btn-primary" onClick={() => !showForm && setShowForm(true)} disabled={loading || showForm}>
              + Add Record
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="inventory-form">
              <div className="form-group">
                <label>Medicine Type *</label>
                <SearchableSelect
                  name="medicineType"
                  value={formData.medicineType}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData((prev) => ({ ...prev, [name]: value }));
                  }}
                  options={MEDICINE_TYPES.map((type) => ({ value: type, label: MEDICINE_LABELS[type] }))}
                  placeholder="Select medicine type..."
                  disabled={editingRecord !== null}
                  required
                />
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
                <SearchableSelect
                  name="unit"
                  value={formData.unit}
                  onChange={(e) => {
                    const { name, value } = e.target;
                    setFormData((prev) => ({ ...prev, [name]: value }));
                  }}
                  options={[
                    { value: 'ml', label: 'ml' },
                    { value: 'g', label: 'g' },
                    { value: 'tablets', label: 'tablets' },
                    { value: 'bottles', label: 'bottles' },
                    { value: 'vials', label: 'vials' },
                    { value: 'boxes', label: 'boxes' },
                  ]}
                />
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

          {inventoryRecords.some(r => r.threshold !== null && r.threshold !== undefined && r.notifyAdmin && r.unitsLeft < r.threshold) && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
              ⚠️ <strong>Low stock alert:</strong> One or more medicine inventory items are below their configured threshold.
            </div>
          )}

          {loading && <TableSkeleton cols={5} rows={5} />}

          {!loading && inventoryRecords.length > 0 ? (
            <>
            <div className="table-wrapper">
              <table className="inventory-table">
              <thead>
                <tr>
                  <th style={{cursor:'pointer',userSelect:'none'}} onClick={() => {
                    setSortKey('medicineType');
                    setSortDir(prev => sortKey === 'medicineType' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
                  }}>Medicine {sortKey === 'medicineType' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th style={{cursor:'pointer',userSelect:'none',minWidth:'260px'}} onClick={() => {
                    setSortKey('unitsLeft');
                    setSortDir(prev => sortKey === 'unitsLeft' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc');
                  }}>Stock Level {sortKey === 'unitsLeft' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th>Unit</th>
                  <th>Threshold</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => {
                  const isBelowThreshold = record.threshold !== null && record.threshold !== undefined && record.unitsLeft < record.threshold;
                  const totalStock = (record.openingStock || 0) + (record.unitsPurchased || 0);
                  const unitsLeft = record.unitsLeft || 0;
                  const pct = totalStock > 0 ? Math.min((unitsLeft / totalStock) * 100, 100) : 0;
                  const barColor = pct < 25 ? '#ef4444' : '#22c55e';
                  return (
                  <tr key={record.id} style={isBelowThreshold ? { background: 'rgba(239,68,68,0.08)' } : {}}>
                    <td style={{fontWeight:500}}>{MEDICINE_LABELS[record.medicineType] || record.medicineType}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                        <span style={{fontFamily:'monospace',fontSize:'0.85rem',minWidth:'50px',textAlign:'right',fontWeight:600}}>{unitsLeft}</span>
                        <div style={{flex:1,background:'var(--bg-muted, #f0f0f0)',borderRadius:'6px',height:'18px',overflow:'hidden',position:'relative'}}>
                          <div style={{width:`${pct}%`,height:'100%',background:barColor,borderRadius:'6px',transition:'width 0.3s ease'}} />
                        </div>
                        <span style={{fontSize:'0.7rem',opacity:0.5,minWidth:'35px'}}>{Math.round(pct)}%</span>
                      </div>
                    </td>
                    <td>{record.unit}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {record.threshold !== null && record.threshold !== undefined
                        ? <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{record.threshold} {record.unit}</span>
                        : <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>—</span>
                      }
                      {isBelowThreshold && <span style={{ marginLeft: 4, color: '#ef4444' }} title="Below threshold">⚠️</span>}
                    </td>
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
                      {isAdmin && (
                        <button
                          className="btn-sm"
                          style={{ fontSize: '0.7rem', padding: '3px 8px', background: record.notifyAdmin ? 'rgba(245,158,11,0.15)' : 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '6px', cursor: 'pointer' }}
                          onClick={() => setThresholdModal({ record, value: record.threshold ?? '', notifyAdmin: record.notifyAdmin ?? false })}
                          title="Configure threshold alert"
                        >
                          🔔
                        </button>
                      )}
                    </td>
                  </tr>
                )})}
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
                total={filteredInventory.length}
              />
            </div>
            </>
          ) : (
            !loading && <p className="no-data">{medicineSearch ? t('No medicines match your search') : `No inventory records for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}</p>
          )}
        </div>
      )}

      {activeTab === 'report' && (
        <div className="report-section">
          <div className="report-controls">
            <div className="date-range" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>Start Date:
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              /></label>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>End Date:
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              /></label>
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
                {downloadingCSV ? 'Downloading...' : '<Download size={14} />CSV'}
              </button>
            </div>
          </div>

          {reportData && Object.keys(reportData).length > 0 ? (
            <div className="report-data">
              <h3>Medicine Inventory Report</h3>
              <p className="report-date-range">
                {reportStartDate} to {reportEndDate}
              </p>
              <div className="table-wrapper">
                <table className="report-table">
                <thead>
                  <tr>
                    <th>Medicine Type</th>
                    <th>Opening Stock</th>
                    <th>Units Purchased</th>
                    <th>Total Used</th>
                    <th>Units Left</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData).map(([type, data]) => (
                    <tr key={type}>
                      <td>{MEDICINE_LABELS[type] || type}</td>
                      <td>{(data.openingStock || 0).toFixed(2)}</td>
                      <td>{(data.unitsPurchased || 0).toFixed(2)}</td>
                      <td>{(data.totalUsed || 0).toFixed(2)}</td>
                      <td>{(data.unitsLeft || 0).toFixed(2)}</td>
                      <td>{data.unit || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            !loading && reportData && <p className="no-data">No data for selected date range</p>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Record"
        message="Are you sure you want to delete this record?"
        confirmText="Delete"
        confirmVariant="danger"
      />

      {thresholdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '12px', padding: '24px', width: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>🔔 Set Threshold Alert</h3>
            <p style={{ margin: '0 0 16px', opacity: 0.6, fontSize: '0.8rem' }}>{MEDICINE_LABELS[thresholdModal.record.medicineType]}</p>
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

export default MedicineInventoryPage;
