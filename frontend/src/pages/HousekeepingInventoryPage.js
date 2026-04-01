import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import * as XLSX from "xlsx";
import { TableSkeleton } from '../components/Skeleton';
import housekeepingInventoryService from "../services/housekeepingInventoryService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import ConfirmModal from "../components/ConfirmModal";
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Package, Pencil, Plus, Sparkles, Trash2, X, Search } from 'lucide-react';
import DatePicker from '../components/shared/DatePicker';
import OperationalMetricCard from '../components/OperationalMetricCard';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';

const CATEGORIES = ["Cleaning Supplies", "Tools", "Consumables"];
const UNIT_TYPES = ["Liters", "Pieces", "Kg"];
const USAGE_AREAS = ["Stable", "Arena", "Wash Area"];

const categoryStyle = {
  'Cleaning Supplies': 'bg-primary/20 text-primary',
  'Tools': 'bg-warning/20 text-warning',
  'Consumables': 'bg-success/20 text-success',
};

const HousekeepingInventoryPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [search, setSearch] = useState("");

  const emptyForm = {
    itemName: "", category: "Cleaning Supplies", quantity: "", unitType: "Pieces",
    minimumStockLevel: "", reorderAlert: false, storageLocation: "",
    supplierName: "", purchaseDate: "", expiryDate: "", usageArea: "",
    consumptionRate: "", lastRestockedDate: "", assignedStaffId: "",
    costPerUnit: "", notes: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const showMsg = (msg, type = "success") => {
    setMessage(msg); setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true); setCurrentPage(1);
      const data = await housekeepingInventoryService.getItems({ search });
      setItems(Array.isArray(data) ? data : []);
    } catch { showMsg("Failed to load housekeeping inventory", "error"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => {
    const load = async () => {
      try { const r = await getEmployees(); const l = r.data?.data || r.data || r || []; setEmployees(Array.isArray(l) ? l : []); } catch { setEmployees([]); }
    };
    load();
  }, []);

  const totalPages = Math.ceil(items.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = items.slice(startIndex, startIndex + rowsPerPage);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => { setFormData(emptyForm); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName || !formData.category) { showMsg("Item name and category are required", "error"); return; }
    try {
      if (editingId) {
        await housekeepingInventoryService.updateItem(editingId, formData);
        showMsg("Item updated");
      } else {
        await housekeepingInventoryService.createItem(formData);
        showMsg("Item added");
      }
      resetForm(); fetchItems();
    } catch (err) { showMsg(err.response?.data?.error || "Failed to save", "error"); }
  };

  const handleEdit = (item) => {
    setFormData({
      itemName: item.itemName, category: item.category,
      quantity: item.quantity, unitType: item.unitType || "Pieces",
      minimumStockLevel: item.minimumStockLevel || "", reorderAlert: item.reorderAlert || false,
      storageLocation: item.storageLocation || "", supplierName: item.supplierName || "",
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : "",
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
      usageArea: item.usageArea || "", consumptionRate: item.consumptionRate || "",
      lastRestockedDate: item.lastRestockedDate ? new Date(item.lastRestockedDate).toISOString().split("T")[0] : "",
      assignedStaffId: item.assignedStaffId || "", costPerUnit: item.costPerUnit || "",
      notes: item.notes || "",
    });
    setEditingId(item.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => setConfirmModal({ isOpen: true, id });
  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try { await housekeepingInventoryService.deleteItem(id); showMsg("Deleted"); fetchItems(); }
    catch { showMsg("Failed to delete", "error"); }
  };

  const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : "-";

  const getExportRows = () => items.map(i => ({
      "Item Name": i.itemName, "Category": i.category,
      "Qty": i.quantity, "Unit": i.unitType, "Min Stock": i.minimumStockLevel || "",
      "Reorder Alert": i.reorderAlert ? "Yes" : "No", "Usage Area": i.usageArea || "",
      "Storage": i.storageLocation || "", "Supplier": i.supplierName || "",
      "Cost/Unit": i.costPerUnit || "", "Purchase Date": formatDate(i.purchaseDate),
      "Expiry": formatDate(i.expiryDate), "Staff": i.assignedStaff?.fullName || "",
      "Notes": i.notes || "",
    }));

  const handleDownloadExcel = () => {
    const data = getExportRows();
    if (data.length === 0) { showNoExportDataToast('No data'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Housekeeping");
    XLSX.writeFile(wb, `HousekeepingInventory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleDownloadCSV = () => {
    const data = getExportRows();
    if (data.length === 0) { showNoExportDataToast('No data'); return; }
    downloadCsvFile(data, `HousekeepingInventory_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const lowStockItems = items.filter(i => i.reorderAlert && i.minimumStockLevel && i.quantity < i.minimumStockLevel);
  const expiredItems = items.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date());

  if (!p.viewHousekeepingInventory) return <Navigate to="/dashboard" replace />;

  return (
    <div className="housekeeping-inventory-page space-y-6 pb-40">
      {/* ── Header ── */}
      <div className="housekeeping-inventory-header-row flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("Housekeeping")} <span className="text-primary">{t("Inventory")}</span></h1>
            <p className="text-sm text-muted-foreground mt-1">{t('Manage cleaning supplies, tools & consumables')}</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }} className="housekeeping-inventory-header-btn h-10 w-fit px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2 shrink-0">
            {showForm && !editingId ? <><X className="w-4 h-4" /> {t("Cancel")}</> : <><Plus className="w-4 h-4" /> {t("Add Item")}</>}
          </button>
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === "error" ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="housekeeping-inventory-kpi-grid grid grid-cols-2 sm:grid-cols-3 gap-4">
        <OperationalMetricCard label={t("TOTAL ITEMS")} value={String(items.length).padStart(2, '0')} icon={Package} colorClass="text-primary" bgClass="bg-primary/10" sub={t("Across all categories")} />
        <OperationalMetricCard label={t("LOW STOCK")} value={String(lowStockItems.length).padStart(2, '0')} icon={AlertTriangle} colorClass="text-warning" bgClass="bg-warning/10" sub={t("Needs reorder")} subColor="text-warning" />
        <div className="housekeeping-inventory-kpi-card--wide-mobile col-span-2 sm:col-span-1">
          <OperationalMetricCard label={t("EXPIRED")} value={String(expiredItems.length).padStart(2, '0')} icon={Sparkles} colorClass="text-destructive" bgClass="bg-destructive/10" sub={t("Past expiry date")} subColor="text-destructive" />
        </div>
      </div>

      {/* ── Low Stock Alert ── */}
      {lowStockItems.length > 0 && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-warning/15 text-warning border border-warning/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <strong>{t("Low Stock Alert:")}</strong> {lowStockItems.map(i => `${i.itemName} (${i.quantity} ${i.unitType})`).join(', ')}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-background/80 px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={resetForm}>
          <div className="my-auto flex w-full max-w-5xl flex-col overflow-visible rounded-2xl border border-border bg-surface-container-highest xl:max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
              <h3 className="text-xl font-bold text-foreground">{editingId ? t("Edit Item") : t("Add Item")}</h3>
              <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
              <div className="p-4 sm:px-5 sm:py-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Item Name *")}</label>
                <input type="text" name="itemName" value={formData.itemName} onChange={handleInputChange} required maxLength={100} placeholder="e.g., Floor Cleaner" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Category *")}</label>
                <SearchableSelect name="category" value={formData.category} onChange={handleInputChange} options={CATEGORIES.map(c => ({ value: c, label: t(c) }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Quantity")}</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" step="0.01" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Unit Type")}</label>
                <SearchableSelect name="unitType" value={formData.unitType} onChange={handleInputChange} options={UNIT_TYPES.map(u => ({ value: u, label: t(u) }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Min Stock Level")}</label>
                <input type="number" name="minimumStockLevel" value={formData.minimumStockLevel} onChange={handleInputChange} min="0" step="0.01" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Usage Area")}</label>
                <SearchableSelect name="usageArea" value={formData.usageArea} onChange={handleInputChange} options={[{ value: '', label: t('-- None --') }, ...USAGE_AREAS.map(a => ({ value: a, label: a }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Storage Location")}</label>
                <input type="text" name="storageLocation" value={formData.storageLocation} onChange={handleInputChange} maxLength={200} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Supplier Name")}</label>
                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} maxLength={200} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Cost per Unit (₹)")}</label>
                <input type="number" name="costPerUnit" value={formData.costPerUnit} onChange={handleInputChange} min="0" step="0.01" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Consumption Rate")}</label>
                <input type="text" name="consumptionRate" value={formData.consumptionRate} onChange={handleInputChange} placeholder="e.g., 2L/week" maxLength={100} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Purchase Date")}</label>
                <DatePicker value={formData.purchaseDate} onChange={(val) => setFormData(prev => ({ ...prev, purchaseDate: val }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Expiry Date")}</label>
                <DatePicker value={formData.expiryDate} onChange={(val) => setFormData(prev => ({ ...prev, expiryDate: val }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Last Restocked")}</label>
                <DatePicker value={formData.lastRestockedDate} onChange={(val) => setFormData(prev => ({ ...prev, lastRestockedDate: val }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Assigned Staff")}</label>
                <SearchableSelect name="assignedStaffId" value={formData.assignedStaffId} onChange={handleInputChange} options={[{ value: '', label: t('-- None --') }, ...employees.map(e => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="reorderAlert" checked={formData.reorderAlert} onChange={handleInputChange} className="w-4 h-4 rounded accent-primary" />
                <label className="text-sm text-foreground">{t("Enable Reorder Alert")}</label>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Notes")}</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" maxLength={500} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none" />
            </div>
          </div>
          </form>
            <div className="p-4 sm:px-5 sm:py-4 border-t border-border flex justify-end gap-3 bg-surface-container-high/50">
              <button type="button" className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-highest transition-colors" onClick={resetForm}>{t("Cancel")}</button>
              <button type="button" onClick={handleSubmit} className="btn-save-primary">{editingId ? t("Save Changes") : t("Add Item")}</button>
            </div>
          </div>
        </div>
      , document.body)}
      {/* ── Table Container (EFM Replica) ── */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        {/* Toolbar */}
        <div className="housekeeping-inventory-toolbar flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-3">
          <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder={t("Search items...")}
              className="h-9 pl-9 pr-3 w-full rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:ml-0 mx-auto sm:mx-0">
            <span className="text-xs text-muted-foreground mono-data hidden sm:block">{items.length} items</span>
            <ExportDialog
              title={t("Export Housekeeping Inventory")}
              options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
              trigger={(
                <button className="h-10 px-4 rounded-lg bg-surface-container-high border border-border text-foreground hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2" type="button" aria-label={t("Export housekeeping inventory")} title={t("Export housekeeping inventory")}>
                  <Download className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">{t("Export")}</span>
                </button>
              )}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? <div className="p-4"><TableSkeleton cols={8} rows={5} /></div> : items.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{search ? `No items matching "${search}"` : t(t(t("No items found.")))}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    {[t('ITEM NAME'), t('CATEGORY'), t('QTY'), t('UNIT'), t('AREA'), t('EXPIRY'), t('STATUS'), ''].map(h => (
                      <th key={h || 'actions'} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(item => {
                    const isLowStock = item.reorderAlert && item.minimumStockLevel && item.quantity < item.minimumStockLevel;
                    const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                    const catCls = categoryStyle[item.category] || 'bg-muted text-muted-foreground';

                    return (
                      <tr key={item.id} className={`border-b border-border/50 hover:bg-surface-container-high/50 transition-colors ${isExpired ? 'bg-destructive/5' : isLowStock ? 'bg-warning/5' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-xs font-bold text-primary shrink-0">{(item.itemName || '?').charAt(0).toUpperCase()}</div>
                            <span className="font-semibold text-sm text-foreground">{item.itemName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${catCls}`}>{item.category}</span>
                        </td>
                        <td className="px-6 py-4 mono-data text-sm font-semibold text-foreground">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{item.unitType}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{item.usageArea || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.expiryDate ? (
                            <span className={`text-xs mono-data ${isExpired ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                              {formatDate(item.expiryDate)}{isExpired && ' [EXP]'}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-destructive"><span className="w-1.5 h-1.5 rounded-full bg-destructive" /> {t("EXPIRED")}</span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-warning"><span className="w-1.5 h-1.5 rounded-full bg-warning" /> {t("LOW STOCK")}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-success"><span className="w-1.5 h-1.5 rounded-full bg-success" /> {t("OK")}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary" title={t("Edit")}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title={t("Delete")}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedItems.length === 0 && (
                    <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">No items match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-t border-border">
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-medium disabled:opacity-30 hover:bg-surface-container-high transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> {t("Previous")}
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-medium disabled:opacity-30 hover:bg-surface-container-high transition-colors flex items-center gap-1">
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages || 1 }, (_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-7 h-7 rounded text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-high'}`}>{i + 1}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title={t("Delete Item")} message={t("Delete this housekeeping item?")} confirmText={t("Delete")} confirmVariant="danger" />
    </div>
  );
};

export default HousekeepingInventoryPage;
