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
import { Download, Search, X, Package, AlertTriangle, TrendingUp, Plus, Pencil, Trash2, BellRing } from 'lucide-react';
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
const OTHER_MEDICINE_VALUE = '__other__';
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MedicineInventoryPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const { user } = useAuth();
  const isAdmin = ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('inventory');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

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
  const [customMedicineType, setCustomMedicineType] = useState('');

  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [sortKey, setSortKey] = useState('medicineType');
  const [sortDir, setSortDir] = useState('asc');

  const [thresholdModal, setThresholdModal] = useState(null);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setCurrentPage(1);
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
      const medicineTypeToSave = formData.medicineType === OTHER_MEDICINE_VALUE ? customMedicineType.trim() : formData.medicineType;
      if (!medicineTypeToSave) {
        showMessage('Medicine type is required', 'error');
        setLoading(false);
        return;
      }
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
          medicineType: medicineTypeToSave,
          customMedicineType: customMedicineType.trim(),
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
    setCustomMedicineType('');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRecord(null);
    resetForm();
  };

  const handleLoadReport = async () => {
    try {
      setLoading(true);
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

  const filteredInventory = inventoryRecords.filter(record => {
    const medicineLabel = (MEDICINE_LABELS[record.medicineType] || record.medicineType).toLowerCase();
    return medicineLabel.includes(medicineSearch.toLowerCase());
  });

  const totalPages = Math.ceil(filteredInventory.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRecords = filteredInventory.slice(startIndex, endIndex);

  const sortedRecords = [...paginatedRecords].sort((a, b) => {
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

  if (!p.viewMedicineInventory) return <Navigate to="/dashboard" replace />;

  const totalStock = inventoryRecords.reduce((s, m) => s + (m.unitsLeft || 0), 0);
  const lowStockCount = inventoryRecords.filter(m => m.threshold !== null && m.threshold !== undefined && m.unitsLeft < m.threshold).length;
  const efficiency = inventoryRecords.length > 0 ? Math.round((totalStock / Math.max(1, inventoryRecords.reduce((s, m) => s + (m.openingStock || 0) + (m.unitsPurchased || 0), 0))) * 100) : 0;
  const reportControlClass = 'h-10 w-full min-w-[180px] px-4 rounded-xl border border-border bg-surface-container-high text-foreground text-sm font-medium focus:ring-1 focus:ring-primary outline-none';
  const reportButtonClass = 'h-10 min-w-[180px] px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2';
  const medicineTypeOptions = [
    ...MEDICINE_TYPES.map((type) => ({ value: type, label: MEDICINE_LABELS[type] })),
    ...(editingRecord && !MEDICINE_LABELS[editingRecord.medicineType]
      ? [{ value: editingRecord.medicineType, label: editingRecord.medicineType }]
      : []),
    { value: OTHER_MEDICINE_VALUE, label: 'Others' },
  ];

  const kpis = [
    { label: 'TOTAL INVENTORY UNITS', value: Math.round(totalStock).toLocaleString(), sub: `${inventoryRecords.length} medicine types`, subColor: 'text-success', icon: Package },
    { label: 'CRITICAL STOCK ALERTS', value: String(lowStockCount).padStart(2, '0'), sub: 'Items below threshold', subColor: lowStockCount > 0 ? 'text-destructive' : 'text-success', icon: AlertTriangle },
    { label: 'STOCK EFFICIENCY', value: `${efficiency}%`, sub: 'Absorption within target', subColor: 'text-success', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Medicine <span className="text-primary">Inventory</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Manage and track medicine stock levels across the facility.')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => !showForm && setShowForm(true)}
            disabled={loading || showForm}
            className="h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === 'success' ? 'bg-success/15 text-success border border-success/30' : 'bg-destructive/15 text-destructive border border-destructive/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2">
              <k.icon className="w-3.5 h-3.5 text-primary" /> {k.label}
            </p>
            <p className="text-4xl font-bold text-foreground mt-2 mono-data">{k.value}</p>
            <p className={`text-xs mt-1 ${k.subColor}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Low Stock Warning ── */}
      {inventoryRecords.some(r => r.threshold !== null && r.threshold !== undefined && r.notifyAdmin && r.unitsLeft < r.threshold) && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-warning/15 text-warning border border-warning/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> <strong>Low stock alert:</strong> One or more medicine inventory items are below their configured threshold.
        </div>
      )}

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1">
        {(['inventory', 'report']).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}>{tab}</button>
        ))}
      </div>

      {/* ═══════════ INVENTORY TAB ═══════════ */}
      {activeTab === 'inventory' && (
        <>
          {/* Month/Year selector + form */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <SearchableSelect
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                options={MONTH_NAMES.map((month, idx) => ({ value: (idx + 1).toString(), label: month }))}
                placeholder="Select month..."
              />
            </div>
            <div className="w-32">
              <SearchableSelect
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                options={[2023, 2024, 2025, 2026, 2027].map((year) => ({ value: year.toString(), label: year.toString() }))}
                placeholder="Select year..."
              />
            </div>
          </div>

          {/* Add/Edit Record Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-surface-container-highest rounded-xl p-6 edge-glow space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Medicine Type *</label>
                  <SearchableSelect
                    name="medicineType"
                    value={formData.medicineType}
                    onChange={(e) => {
                      const { name, value } = e.target;
                      setFormData((prev) => ({ ...prev, [name]: value }));
                    }}
                    options={medicineTypeOptions}
                    placeholder="Select medicine type..."
                    disabled={editingRecord !== null}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Unit</label>
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
              </div>
              {formData.medicineType === OTHER_MEDICINE_VALUE && !editingRecord && (
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Other Medicine Type *</label>
                  <input
                    type="text"
                    value={customMedicineType}
                    onChange={(e) => setCustomMedicineType(e.target.value)}
                    placeholder="Enter medicine type..."
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Opening Stock</label>
                  <input type="number" name="openingStock" value={formData.openingStock} onChange={(e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); }} min="0" step="0.01" placeholder="0" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Units Purchased</label>
                  <input type="number" name="unitsPurchased" value={formData.unitsPurchased} onChange={(e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); }} min="0" step="0.01" placeholder="0" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
                <textarea name="notes" value={formData.notes} onChange={(e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); }} placeholder="Additional notes..." rows="3" className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="h-10 px-6 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">
                  {loading ? 'Saving...' : editingRecord ? 'Update Record' : 'Create Record'}
                </button>
                <button type="button" onClick={handleCancel} disabled={loading} className="h-10 px-6 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={medicineSearch}
                    onChange={e => { setMedicineSearch(e.target.value); setCurrentPage(1); }}
                    placeholder={t("Search medicine...")}
                    className="h-10 pl-9 pr-3 w-full sm:w-72 rounded-xl border border-border bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  {medicineSearch && <button onClick={() => setMedicineSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>}
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleDownloadExcel} className="btn-download h-10 px-4 sm:px-5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>

            {loading && <div className="p-6"><TableSkeleton cols={5} rows={5} /></div>}

            {!loading && sortedRecords.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[750px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase cursor-pointer" onClick={() => { setSortKey('medicineType'); setSortDir(prev => sortKey === 'medicineType' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}>
                          Medicine Type {sortKey === 'medicineType' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase cursor-pointer" style={{minWidth: '260px'}} onClick={() => { setSortKey('unitsLeft'); setSortDir(prev => sortKey === 'unitsLeft' ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'); }}>
                          Stock Level {sortKey === 'unitsLeft' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        {['UNIT', 'THRESHOLD', 'ACTIONS'].map(h => (
                          <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRecords.map(record => {
                        const isBelowThreshold = record.threshold !== null && record.threshold !== undefined && record.unitsLeft < record.threshold;
                        const totalStockRow = (record.openingStock || 0) + (record.unitsPurchased || 0);
                        const unitsLeft = record.unitsLeft || 0;
                        const pct = totalStockRow > 0 ? Math.min((unitsLeft / totalStockRow) * 100, 100) : 0;
                        const isLow = pct < 25;
                        return (
                          <tr key={record.id} className={`border-b border-border/50 hover:bg-surface-container-high/50 transition-colors ${isBelowThreshold ? 'bg-destructive/5' : ''}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-xs font-bold text-primary shrink-0">{(MEDICINE_LABELS[record.medicineType] || record.medicineType || '?').charAt(0).toUpperCase()}</div>
                                <span className="font-semibold text-sm text-foreground">{MEDICINE_LABELS[record.medicineType] || record.medicineType}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="mono-data text-sm min-w-[40px]">{unitsLeft}</span>
                                <div className="w-16 h-1.5 rounded-full bg-surface-container overflow-hidden">
                                  <div className={`h-full rounded-full ${isLow ? 'bg-destructive' : 'bg-success'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground mono-data">{Math.round(pct)}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{record.unit}</td>
                            <td className="px-6 py-4 text-sm">
                              {record.threshold !== null && record.threshold !== undefined
                                ? <span className="mono-data">{record.threshold} {record.unit}</span>
                                : <span className="text-muted-foreground/40">—</span>
                              }
                              {isBelowThreshold && <span className="ml-1.5 text-[10px] text-destructive font-bold cursor-help" title="Low stock! Below threshold limit.">⚠ LOW</span>}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1.5">
                                <button onClick={() => handleEdit(record)} disabled={loading || showForm} className="p-1.5 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary disabled:opacity-50" title="Edit">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(record.id)} disabled={loading || showForm} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => setThresholdModal({ record, value: record.threshold ?? '', notifyAdmin: record.notifyAdmin ?? false })}
                                    disabled={loading || showForm}
                                    title="Configure threshold alert"
                                    className={`p-1.5 rounded transition-colors disabled:opacity-50 ${record.notifyAdmin ? 'bg-warning/15 text-warning' : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'}`}
                                  >
                                    <BellRing className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {sortedRecords.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">No records match your filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 sm:px-6 py-3 border-t border-border">
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
              !loading && <p className="px-6 py-8 text-center text-sm text-muted-foreground">{medicineSearch ? t('No medicines match your search') : `No inventory records for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}</p>
            )}
          </div>
        </>
      )}

      {/* ═══════════ REPORT TAB ═══════════ */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="bg-surface-container-highest rounded-xl p-6 edge-glow">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Start Date</label>
                <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className={reportControlClass} />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">End Date</label>
                <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className={reportControlClass} />
              </div>
              <button onClick={handleLoadReport} disabled={loading} className={`${reportButtonClass} bg-primary text-primary-foreground hover:brightness-110`}>
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
              {reportData && Object.keys(reportData).length > 0 && (
                <button onClick={handleDownloadCSV} disabled={downloadingCSV} className={`${reportButtonClass} border border-border text-foreground hover:bg-surface-container-high`}>
                  <Download className="w-4 h-4" /> {downloadingCSV ? 'Downloading...' : 'CSV'}
                </button>
              )}
            </div>
          </div>

          {reportData && Object.keys(reportData).length > 0 ? (
            <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">Medicine Inventory Report</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mono-data">{reportStartDate} to {reportEndDate}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      {['Medicine Type', 'Opening Stock', 'Units Purchased', 'Total Used', 'Units Left', 'Unit'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData).map(([type, data]) => (
                      <tr key={type} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-sm text-foreground">{MEDICINE_LABELS[type] || type}</td>
                        <td className="px-6 py-4 mono-data text-sm">{(data.openingStock || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 mono-data text-sm">{(data.unitsPurchased || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 mono-data text-sm">{(data.totalUsed || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 mono-data text-sm">{(data.unitsLeft || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{data.unit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            !loading && reportData && <p className="text-center py-8 text-sm text-muted-foreground">No data for selected date range</p>
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

      {/* ── Threshold Modal ── */}
      {thresholdModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-highest rounded-xl border border-border p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-foreground">Set Threshold Alert</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{MEDICINE_LABELS[thresholdModal.record.medicineType]}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Threshold quantity ({thresholdModal.record.unit})</label>
                <input type="number" min="0" step="0.01" placeholder="Leave empty to disable" value={thresholdModal.value} onChange={e => setThresholdModal(prev => ({ ...prev, value: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input type="checkbox" checked={thresholdModal.notifyAdmin} onChange={e => setThresholdModal(prev => ({ ...prev, notifyAdmin: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                Notify admin when below threshold
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setThresholdModal(null)} className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
                <button onClick={handleSaveThreshold} disabled={loading} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineInventoryPage;
