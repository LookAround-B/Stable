import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import InventoryCharts from '../components/InventoryCharts';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import feedInventoryService from '../services/feedInventoryService';
import { RotateCw, Download, Plus, X, AlertTriangle, Package, TrendingUp, Pencil, BellRing, Settings, SlidersHorizontal, Search } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import DatePicker from '../components/shared/DatePicker';
import ExportDialog from '../components/shared/ExportDialog';
import { downloadCsvFile } from '../lib/csvExport';
import { writeRowsToXlsx } from '../lib/xlsxExport';

const FEED_LABELS = {
  balance: 'Himalayan Balance', barley: 'Barley', oats: 'Oats', soya: 'Soya', lucerne: 'Lucerne',
  linseed: 'Linseed', rOil: 'R.Oil', biotin: 'Biotin', joint: 'Joint', epsom: 'Epsom', heylase: 'Heylase',
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
  const [activeTab, setActiveTab] = useState('inventory');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({ feedType: '', unitsBrought: '', openingStock: '', unit: 'kg', notes: '' });

  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [thresholdModal, setThresholdModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTableSearch, setShowTableSearch] = useState(false);

  const showMessage = (msg, type = 'success') => { setMessage(msg); setMessageType(type); setTimeout(() => setMessage(''), 5000); };

  const loadInventory = useCallback(async () => {
    try { setLoading(true); setCurrentPage(1); const result = await feedInventoryService.getInventory({ month: selectedMonth, year: selectedYear }); setInventoryRecords(result.data || []); }
    catch (error) { showMessage('Failed to load inventory records', 'error'); }
    finally { setLoading(false); }
  }, [selectedMonth, selectedYear]);

  useEffect(() => { if (activeTab === 'inventory') { loadInventory(); } }, [activeTab, loadInventory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingRecord) {
        await feedInventoryService.updateInventory({ id: editingRecord.id, unitsBrought: formData.unitsBrought, openingStock: formData.openingStock, unit: formData.unit, notes: formData.notes });
        showMessage('Inventory record updated successfully');
      } else {
        await feedInventoryService.createInventory({ feedType: formData.feedType, month: selectedMonth, year: selectedYear, unitsBrought: formData.unitsBrought, openingStock: formData.openingStock, unit: formData.unit, notes: formData.notes });
        showMessage('Inventory record created successfully');
      }
      setShowForm(false); setEditingRecord(null); resetForm(); loadInventory();
    } catch (error) { showMessage(error.error || 'Failed to save inventory record', 'error'); }
    finally { setLoading(false); }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({ feedType: record.feedType, unitsBrought: record.unitsBrought.toString(), openingStock: record.openingStock.toString(), unit: record.unit, notes: record.notes || '' });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRecalculate = async () => {
    try { setLoading(true); const result = await feedInventoryService.recalculate(selectedMonth, selectedYear); showMessage(result.message || 'Usage recalculated successfully'); loadInventory(); }
    catch (error) { showMessage(error.error || 'Failed to recalculate usage', 'error'); }
    finally { setLoading(false); }
  };

  const resetForm = () => setFormData({ feedType: '', unitsBrought: '', openingStock: '', unit: 'kg', notes: '' });

  const availableFeedTypes = FEED_TYPES.filter((ft) => !inventoryRecords.some((r) => r.feedType === ft));

  const loadReport = async () => {
    try { setLoading(true); const result = await feedInventoryService.getConsumptionReport(reportStartDate, reportEndDate); setReportData(result.data); }
    catch (error) { showMessage('Failed to load consumption report', 'error'); }
    finally { setLoading(false); }
  };

  const getInventoryExportRows = () => inventoryRecords.map((record) => {
      const totalAvailable = (record.openingStock || 0) + (record.unitsBrought || 0);
      const percentUsed = totalAvailable > 0 ? ((record.totalUsed || 0) / totalAvailable) * 100 : 0;
      return {
        'Feed Type': FEED_LABELS[record.feedType] || record.feedType,
        'Opening Stock': record.openingStock ?? 0,
        'Units Brought': record.unitsBrought ?? 0,
        'Total Available': totalAvailable,
        'Used Today': record.usedToday ?? 0,
        'Total Used': record.totalUsed ?? 0,
        'Units Left': record.unitsLeft ?? 0,
        'Unit': record.unit || '',
        'Status %': `${Math.round(percentUsed)}%`,
        'Threshold': record.threshold ?? '',
        'Month': MONTH_NAMES[selectedMonth - 1],
        'Year': selectedYear,
      };
    });

  const handleDownloadInventoryCSV = () => {
    const data = getInventoryExportRows();
    if (!data.length) return;
    downloadCsvFile(
      data,
      `FeedInventory_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`
    );
  };

  const handleDownloadExcel = async () => {
    const data = getInventoryExportRows();
    if (!data.length) return;
    await writeRowsToXlsx(data, {
      sheetName: 'Feed Inventory',
      fileName: `FeedInventory_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`,
    });
  };

  const getReportExportRows = () => {
    if (!reportData?.horseConsumption) return [];
    return Object.values(reportData.horseConsumption).map((hc) => ({
      'Horse': hc.horseName,
      'Stable': hc.stableNumber || '-',
      'Days': hc.daysRecorded,
      ...Object.fromEntries(
        FEED_TYPES
          .filter((ft) => reportData.totalConsumption?.[ft] > 0)
          .map((ft) => [FEED_LABELS[ft], hc.feeds?.[ft] || 0])
      ),
    }));
  };

  const handleDownloadReportCSV = () => {
    const rows = getReportExportRows();
    if (!rows.length) { showMessage('No report data to export', 'error'); return; }
    downloadCsvFile(rows, `FeedConsumption_${reportStartDate}_to_${reportEndDate}.csv`);
  };

  const handleDownloadReportExcel = async () => {
    const rows = getReportExportRows();
    if (!rows.length) { showMessage('No report data to export', 'error'); return; }
    await writeRowsToXlsx(rows, {
      sheetName: 'Feed Report',
      fileName: `FeedConsumption_${reportStartDate}_to_${reportEndDate}.xlsx`,
    });
  };

  const filteredInventoryRecords = inventoryRecords.filter((record) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const feedLabel = (FEED_LABELS[record.feedType] || record.feedType || '').toLowerCase();
    return [
      feedLabel,
      String(record.unit || '').toLowerCase(),
      String(record.notes || '').toLowerCase(),
    ].some((value) => value.includes(term));
  });

  const totalPages = Math.max(1, Math.ceil(filteredInventoryRecords.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRecords = filteredInventoryRecords.slice(startIndex, startIndex + rowsPerPage);

  const handleSaveThreshold = async () => {
    if (!thresholdModal) return;
    try {
      setLoading(true);
      await feedInventoryService.setThreshold(thresholdModal.record.id, thresholdModal.value === '' ? null : parseFloat(thresholdModal.value), thresholdModal.notifyAdmin);
      showMessage('Threshold updated'); setThresholdModal(null); loadInventory();
    } catch { showMessage('Failed to update threshold', 'error'); }
    finally { setLoading(false); }
  };

  if (!p.viewFeedInventory) return <Navigate to="/dashboard" replace />;

  return (
    <div className="feed-inventory-page space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Feed <span className="text-primary">{t("Inventory")}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Feed Inventory Management')}</p>
        </div>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${messageType === 'error' ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{messageType === 'success' ? '✓' : '✕'} {message}</div>}

      {/* Tabs */}
      <div className="feed-inventory-tab-switcher flex items-center gap-3 w-full overflow-x-auto pb-1 hide-scrollbar">
        <button onClick={() => setActiveTab('inventory')} className={`feed-inventory-tab-btn px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
          <Package className="w-4 h-4" /> Monthly Inventory
        </button>
        <button onClick={() => setActiveTab('report')} className={`feed-inventory-tab-btn px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'report' ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}>
          <TrendingUp className="w-4 h-4" /> Consumption Report
        </button>
      </div>

      {/* ═══ INVENTORY TAB ═══ */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="feed-inventory-controls flex flex-col md:flex-row items-stretch md:items-end gap-4 p-4 rounded-xl bg-surface-container-highest border border-border edge-glow">
            <div className="feed-inventory-control-grid flex items-end gap-3 w-full sm:w-auto">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Month")}</label>
                <SearchableSelect
                  value={selectedMonth.toString()}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  options={MONTH_NAMES.map((name, i) => ({ value: (i + 1).toString(), label: name }))}
                  placeholder={t("Select month...")}
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Year")}</label>
                <SearchableSelect
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  options={[2024, 2025, 2026, 2027].map((y) => ({ value: y.toString(), label: y.toString() }))}
                  placeholder={t("Select year...")}
                  searchable={false}
                />
              </div>
            </div>
            <div className="feed-inventory-actions flex gap-2 md:ml-auto w-full sm:w-auto">
              <button onClick={() => { resetForm(); setEditingRecord(null); setShowForm(!showForm); }} disabled={availableFeedTypes.length === 0 && !showForm} className="feed-inventory-add-btn flex-1 h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex justify-center items-center gap-2 whitespace-nowrap disabled:opacity-50">
                {showForm ? <><X className="w-4 h-4" /> {t("Cancel")}</> : <><Plus className="w-4 h-4" /> {t("Add Entry")}</>}
              </button>
              <button onClick={handleRecalculate} disabled={loading || inventoryRecords.length === 0} className="feed-inventory-recalc-btn h-10 px-4 rounded-lg border border-primary/35 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.14)] text-foreground text-sm font-medium hover:bg-surface-container transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[120px]">
                <RotateCw className="w-4 h-4" /> Recalculate
              </button>
            </div>
          </div>

          {/* Form */}
          {showForm && ReactDOM.createPortal(
            <div className="efm-page-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-background/80 px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={() => { setShowForm(false); setEditingRecord(null); resetForm(); }}>
              <div className="my-auto flex w-full max-w-5xl flex-col overflow-visible rounded-xl border border-border bg-surface-container-highest xl:max-w-6xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
                  <h3 className="text-xl font-bold text-foreground">{editingRecord ? `Edit: ${FEED_LABELS[editingRecord.feedType]}` : 'Add Stock Entry'}</h3>
                  <button type="button" onClick={() => { setShowForm(false); setEditingRecord(null); resetForm(); }} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 sm:px-5 sm:py-4">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {!editingRecord && (
                        <div>
                          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Feed Type *")}</label>
                          <SearchableSelect name="feedType" value={formData.feedType} onChange={(e) => setFormData({ ...formData, feedType: e.target.value })} options={availableFeedTypes.map((ft) => ({ value: ft, label: FEED_LABELS[ft] }))} placeholder={t("Select feed type...")} required />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Opening Stock")}</label>
                        <input type="number" step="0.01" min="0" value={formData.openingStock} onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })} placeholder="0" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Units Brought *")}</label>
                        <input type="number" step="0.01" min="0" value={formData.unitsBrought} onChange={(e) => setFormData({ ...formData, unitsBrought: e.target.value })} required placeholder="0" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Unit")}</label>
                        <SearchableSelect name="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} options={[{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'liters', label: 'Liters' }, { value: 'packets', label: 'Packets' }, { value: 'bags', label: 'Bags' }, { value: 'units', label: 'Units' }]} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Notes")}</label>
                      <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes..." rows={2} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={loading} className="btn-save-primary">{loading ? 'Saving...' : editingRecord ? 'Save Changes' : 'Create Entry'}</button>
                      <button type="button" onClick={() => { setShowForm(false); setEditingRecord(null); resetForm(); }} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          , document.body)}

          {/* Low Stock Alert */}
          {inventoryRecords.some(r => r.threshold !== null && r.threshold !== undefined && r.notifyAdmin && r.unitsLeft < r.threshold) && (
            <div className="rounded-xl p-4 border border-warning/30 bg-warning/10 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <p className="text-sm text-foreground font-medium"><strong>{t("Low stock alert:")}</strong> One or more feed inventory items are below their configured threshold.</p>
            </div>
          )}

          {/* Inventory Table (EFM style) */}
          <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">{MONTH_NAMES[selectedMonth - 1]} {selectedYear} Status</h3>
                <div className="feed-inventory-status-actions flex items-center gap-2">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      placeholder={t("Search feed type...")}
                      className="h-10 pl-10 pr-3 w-52 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <button
                    onClick={() => setShowTableSearch((prev) => !prev)}
                    className={`p-2 rounded-lg transition-colors sm:hidden ${showTableSearch ? 'bg-primary/15 text-primary' : 'bg-surface-container-high text-muted-foreground hover:text-foreground'}`}
                    aria-label={t("Toggle search")}
                    type="button"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  {inventoryRecords.length > 0 && (
                    <ExportDialog
                      title={t("Export Feed Inventory")}
                      options={{ xlsx: handleDownloadExcel, csv: handleDownloadInventoryCSV }}
                      trigger={(
                        <button
                          className="feed-inventory-mobile-export btn-download h-10 w-10 rounded-lg border border-border text-foreground transition-colors flex items-center justify-center sm:hidden"
                          aria-label={t("Export feed inventory")}
                          title={t("Export feed inventory")}
                          type="button"
                        >
                          <Download className="w-4 h-4 shrink-0" />
                        </button>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
            {showTableSearch && (
              <div className="px-5 py-4 border-b border-border bg-surface-container-high/50 sm:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    placeholder={t("Search feed type...")}
                    className="h-10 pl-10 pr-3 w-full rounded-lg bg-surface-container-high border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : filteredInventoryRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? (
                  <p>{t("No feed inventory records match your search.")}</p>
                ) : (
                  <>
                    <p>No inventory records for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.</p>
                    <p className="text-xs mt-1">Click "Add Entry" to start tracking feed inventory.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border">
                        {['FEED TYPE', 'OPENING', 'BROUGHT', 'TOTAL', 'USED TODAY', 'TOTAL USED', 'LEFT', 'UNIT', 'STATUS', 'THRESHOLD', ''].map(h => (
                          <th key={h || 'actions'} className="px-5 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((record) => {
                        const totalAvailable = record.openingStock + record.unitsBrought;
                        const percentUsed = totalAvailable > 0 ? (record.totalUsed / totalAvailable) * 100 : 0;
                        const isLow = record.unitsLeft < totalAvailable * 0.2;
                        const isEmpty = record.unitsLeft <= 0;
                        const isBelowThreshold = record.threshold !== null && record.threshold !== undefined && record.unitsLeft < record.threshold;
                        const barColor = percentUsed > 80 ? 'bg-destructive' : percentUsed > 50 ? 'bg-warning' : 'bg-success';
                        const label = FEED_LABELS[record.feedType] || record.feedType;

                        return (
                          <tr key={record.id} className={`border-b border-border/50 hover:bg-surface-container-high/50 transition-colors ${isBelowThreshold ? 'bg-destructive/5' : isEmpty ? 'bg-destructive/5' : isLow ? 'bg-warning/5' : ''}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-xs font-bold text-primary shrink-0">{(label || '?').charAt(0).toUpperCase()}</div>
                                <span className="font-semibold text-sm text-foreground">{label}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground mono-data">{record.openingStock}</td>
                            <td className="px-5 py-4 text-muted-foreground mono-data">{record.unitsBrought}</td>
                            <td className="px-5 py-4 font-medium text-foreground mono-data">{totalAvailable}</td>
                            <td className={`px-5 py-4 mono-data ${record.usedToday > 0 ? 'text-warning font-medium' : 'text-muted-foreground'}`}>{record.usedToday ?? 0}</td>
                            <td className="px-5 py-4 text-muted-foreground mono-data">{record.totalUsed}</td>
                            <td className={`px-5 py-4 font-bold mono-data ${isEmpty ? 'text-destructive' : isLow ? 'text-warning' : 'text-success'}`}>{record.unitsLeft}</td>
                            <td className="px-5 py-4 text-xs text-muted-foreground">{record.unit}</td>
                            <td className="px-5 py-4 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, percentUsed)}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground mono-data w-7 text-right">{percentUsed.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              {record.threshold !== null && record.threshold !== undefined
                                ? <span className="text-xs mono-data">{record.threshold}</span>
                                : <span className="text-muted-foreground/40 text-xs">—</span>
                              }
                              {isBelowThreshold && <span className="ml-1 text-destructive" title="Below threshold">⚠</span>}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-1">
                                <button onClick={() => handleEdit(record)} className="p-1.5 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary" title="Edit Entry"><Pencil className="w-3.5 h-3.5" /></button>
                                {isAdmin && (
                                  <button onClick={() => setThresholdModal({ record, value: record.threshold ?? '', notifyAdmin: record.notifyAdmin ?? false })} className={`p-1.5 rounded transition-colors ${record.notifyAdmin ? 'bg-warning/15 text-warning' : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'}`} title="Configure threshold alert"><Settings className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-1 border-t border-border">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }} total={filteredInventoryRecords.length} />
                </div>
              </>
            )}
          </div>

          <InventoryCharts type="feed" records={inventoryRecords} labels={FEED_LABELS} />
        </div>
      )}

      {/* ═══ CONSUMPTION REPORT TAB ═══ */}
      {activeTab === 'report' && (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4 p-4 rounded-xl bg-surface-container-highest border border-border edge-glow">
            <div className="flex flex-wrap sm:flex-nowrap items-end gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Start Date")}</label>
                <DatePicker value={reportStartDate} onChange={(val) => setReportStartDate(val)} />
              </div>
              <div className="w-full sm:w-auto">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("End Date")}</label>
                <DatePicker value={reportEndDate} onChange={(val) => setReportEndDate(val)} />
              </div>
            </div>
            <div className="flex gap-2 md:ml-auto w-full sm:w-auto">
              <button onClick={loadReport} disabled={loading} className="feed-inventory-report-generate flex-1 sm:flex-none h-10 px-5 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase hover:brightness-110 transition-all disabled:opacity-50 min-w-[150px]">{loading ? 'Loading...' : 'Generate'}</button>
              {reportData && (
                <ExportDialog
                  title={t("Export Feed Report")}
                  options={{ xlsx: handleDownloadReportExcel, csv: handleDownloadReportCSV }}
                  trigger={(
                    <button className="h-10 w-10 rounded-lg border border-border text-foreground hover:bg-surface-container transition-colors flex items-center justify-center" type="button" aria-label={t("Export feed report")} title={t("Export feed report")}>
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                />
              )}
            </div>
          </div>

          {reportData && (
            <div className="space-y-4">
              {/* Total Consumption Cards */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 px-1">Total Consumption ({new Date(reportStartDate).toLocaleDateString('en-GB')} to {new Date(reportEndDate).toLocaleDateString('en-GB')})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                    <div key={ft} className="bg-surface-container-highest rounded-xl p-4 edge-glow relative overflow-hidden">
                      <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{FEED_LABELS[ft]}</p>
                      <p className="text-2xl font-bold text-foreground mt-1 mono-data">{reportData.totalConsumption[ft]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Horse-wise Consumption */}
              <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
                <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-bold text-foreground">{t("Horse-wise Consumption")}</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("HORSE")}</th>
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("STABLE")}</th>
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("DAYS")}</th>
                        {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                          <th key={ft} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">{FEED_LABELS[ft]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(reportData.horseConsumption).map(([horseId, hc], index, arr) => (
                        <tr key={horseId} className={`hover:bg-surface-container-high/50 transition-colors ${index === arr.length - 1 ? '' : 'border-b border-border/50'}`}>
                          <td className="px-5 py-3 font-medium text-foreground">{hc.horseName}</td>
                          <td className="px-5 py-3 text-muted-foreground">{hc.stableNumber || '-'}</td>
                          <td className="px-5 py-3 text-muted-foreground mono-data">{hc.daysRecorded}</td>
                          {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                            <td key={ft} className="px-5 py-3 text-muted-foreground mono-data">{hc.feeds[ft] || '-'}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t border-primary/20 bg-primary/5">
                        <td className="px-5 py-4 font-bold text-foreground">TOTAL</td>
                        <td></td><td></td>
                        {FEED_TYPES.filter((ft) => reportData.totalConsumption[ft] > 0).map((ft) => (
                          <td key={ft} className="px-5 py-4 font-bold text-primary mono-data">{reportData.totalConsumption[ft]}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Threshold Modal */}
      {thresholdModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setThresholdModal(null)}>
          <div className="bg-surface-container-highest border border-border rounded-xl p-7 w-full max-w-sm edge-glow" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2"><BellRing className="w-5 h-5 text-warning" /> Set Alert Threshold</h3>
              <button className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors" onClick={() => setThresholdModal(null)}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm font-medium text-foreground mb-5 mt-2 bg-surface-container px-3 py-1.5 rounded">{FEED_LABELS[thresholdModal.record.feedType] || thresholdModal.record.feedType}</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Threshold quantity ({thresholdModal.record.unit})</label>
                <input type="number" min="0" step="0.01" placeholder="Leave empty to disable" value={thresholdModal.value} onChange={e => setThresholdModal(prev => ({ ...prev, value: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer bg-surface-container p-3 rounded-lg border border-border/50">
                <input type="checkbox" checked={thresholdModal.notifyAdmin} onChange={e => setThresholdModal(prev => ({ ...prev, notifyAdmin: e.target.checked }))} className="w-4 h-4 rounded accent-primary" />
                Notify admin when below threshold
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveThreshold} disabled={loading} className="btn-save-primary flex-1">{t("Save Alert")}</button>
                <button onClick={() => setThresholdModal(null)} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedInventoryPage;
