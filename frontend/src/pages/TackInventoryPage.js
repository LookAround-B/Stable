import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { TableSkeleton } from '../components/Skeleton';
import OperationalMetricCard from '../components/OperationalMetricCard';
import tackInventoryService from "../services/tackInventoryService";
import { getHorses } from "../services/horseService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import ConfirmModal from "../components/ConfirmModal";
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Package, Pencil, Plus, Search, Trash2, Wrench, X } from 'lucide-react';

const CATEGORIES = ["Saddle", "Bridle", "Grooming Gear", "Training Equipment"];
const CONDITIONS = ["New", "Good", "Worn", "Damaged"];

const categoryStyle = {
  Saddle: 'bg-primary/20 text-primary',
  Bridle: 'bg-success/20 text-success',
  'Grooming Gear': 'bg-warning/20 text-warning',
  'Training Equipment': 'bg-accent/20 text-accent-foreground',
};

const conditionStyle = {
  New: { color: 'text-success', dot: 'bg-success' },
  Good: { color: 'text-success', dot: 'bg-success' },
  Worn: { color: 'text-warning', dot: 'bg-warning' },
  Fair: { color: 'text-warning', dot: 'bg-warning' },
  Damaged: { color: 'text-destructive', dot: 'bg-destructive' },
  Poor: { color: 'text-destructive', dot: 'bg-destructive' },
  Replace: { color: 'text-destructive', dot: 'bg-destructive' },
};

const TackInventoryPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const [items, setItems] = useState([]);
  const [horses, setHorses] = useState([]);
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
    itemName: "", category: "Saddle", horseId: "", riderId: "",
    quantity: "1", condition: "Good", brand: "", size: "", material: "",
    purchaseDate: "", lastUsedDate: "", maintenanceRequired: false,
    notes: "", cleaningSchedule: "", repairHistory: "", storageLocation: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const showMsg = (msg, type = "success") => {
    setMessage(msg); setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true); setCurrentPage(1);
      const data = await tackInventoryService.getItems({ search });
      setItems(Array.isArray(data) ? data : []);
    } catch { showMsg("Failed to load tack inventory", "error"); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => {
    const load = async () => {
      try { const r = await getHorses(); setHorses(Array.isArray(r.data) ? r.data : r.data?.data || []); } catch { setHorses([]); }
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
        await tackInventoryService.updateItem(editingId, formData);
        showMsg("Item updated");
      } else {
        await tackInventoryService.createItem(formData);
        showMsg("Item added");
      }
      resetForm(); fetchItems();
    } catch (err) { showMsg(err.response?.data?.error || "Failed to save", "error"); }
  };

  const handleEdit = (item) => {
    setFormData({
      itemName: item.itemName, category: item.category, horseId: item.horseId || "",
      riderId: item.riderId || "", quantity: item.quantity, condition: item.condition || "Good",
      brand: item.brand || "", size: item.size || "", material: item.material || "",
      purchaseDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : "",
      lastUsedDate: item.lastUsedDate ? new Date(item.lastUsedDate).toISOString().split("T")[0] : "",
      maintenanceRequired: item.maintenanceRequired || false,
      notes: item.notes || "", cleaningSchedule: item.cleaningSchedule || "",
      repairHistory: item.repairHistory || "", storageLocation: item.storageLocation || "",
    });
    setEditingId(item.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => setConfirmModal({ isOpen: true, id });
  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try { await tackInventoryService.deleteItem(id); showMsg("Deleted"); fetchItems(); }
    catch { showMsg("Failed to delete", "error"); }
  };

  const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : "-";

  const handleDownloadExcel = () => {
    if (items.length === 0) { alert("No data"); return; }
    const data = items.map(i => ({
      "Item Name": i.itemName, "Category": i.category, "Horse": i.horse?.name || "-",
      "Rider": i.rider?.fullName || "-", "Qty": i.quantity, "Condition": i.condition,
      "Brand": i.brand || "", "Size": i.size || "", "Material": i.material || "",
      "Purchase Date": formatDate(i.purchaseDate), "Last Used": formatDate(i.lastUsedDate),
      "Maintenance": i.maintenanceRequired ? "Yes" : "No", "Storage": i.storageLocation || "",
      "Notes": i.notes || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "TackInventory");
    XLSX.writeFile(wb, `TackInventory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const uniqueCategories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const maintenanceItems = items.filter(i => i.maintenanceRequired);
  const needsAttention = items.filter(i => i.condition === 'Damaged' || i.condition === 'Poor' || i.condition === 'Replace').length;

  if (!p.viewTackInventory) return <Navigate to="/dashboard" replace />;

  return (
    <div className="tack-inventory-page space-y-6">
      {/* ── Header ── */}
      <div className="tack-inventory-header-row flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tack <span className="text-primary">Inventory</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Manage tack and equipment across all stable operations.')}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }} className="tack-inventory-header-btn h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2 shrink-0">
          {showForm && !editingId ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Item</>}
        </button>
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === "error" ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* ── KPI Cards (EFM Style) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <OperationalMetricCard label="TOTAL ITEMS" value={String(items.length).padStart(2, '0')} icon={Package} colorClass="text-primary" bgClass="bg-primary/10" sub="Inventory count" subColor="text-success" />
        <OperationalMetricCard label="CATEGORIES" value={String(uniqueCategories.length || CATEGORIES.length).padStart(2, '0')} icon={Package} colorClass="text-primary" bgClass="bg-primary/10" sub="Unique equipment types" />
        <OperationalMetricCard label="NEEDS ATTENTION" value={String(needsAttention + maintenanceItems.length).padStart(2, '0')} icon={Wrench} colorClass="text-destructive" bgClass="bg-destructive/10" sub="Items flagged for repair" subColor="text-destructive" />
      </div>

      {/* ── Maintenance Alert ── */}
      {maintenanceItems.length > 0 && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <strong>Maintenance Required:</strong> {maintenanceItems.map(i => i.itemName).join(', ')}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <h3 className="text-lg font-bold text-foreground mb-4">{editingId ? "Edit Tack Item" : "Add Tack Item"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Item Name *</label>
                <input type="text" name="itemName" value={formData.itemName} onChange={handleInputChange} required maxLength={100} placeholder="e.g., English Saddle" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Category *</label>
                <SearchableSelect name="category" value={formData.category} onChange={handleInputChange} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Assigned Horse</label>
                <SearchableSelect name="horseId" value={formData.horseId} onChange={handleInputChange} options={[{ value: '', label: '-- None --' }, ...horses.map(h => ({ value: h.id, label: `${h.name} (#${h.stableNumber || ''})` }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Assigned Rider</label>
                <SearchableSelect name="riderId" value={formData.riderId} onChange={handleInputChange} options={[{ value: '', label: '-- None --' }, ...employees.map(e => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Quantity</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Condition</label>
                <SearchableSelect name="condition" value={formData.condition} onChange={handleInputChange} options={CONDITIONS.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Brand</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} maxLength={100} placeholder="e.g. Stubben" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Storage Location</label>
                <input type="text" name="storageLocation" value={formData.storageLocation} onChange={handleInputChange} maxLength={200} placeholder="e.g. Tack Room A" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Size</label>
                <input type="text" name="size" value={formData.size} onChange={handleInputChange} maxLength={50} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Material</label>
                <input type="text" name="material" value={formData.material} onChange={handleInputChange} maxLength={100} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Purchase Date</label>
                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Last Used Date</label>
                <input type="date" name="lastUsedDate" value={formData.lastUsedDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Cleaning Schedule</label>
                <input type="text" name="cleaningSchedule" value={formData.cleaningSchedule} onChange={handleInputChange} maxLength={200} placeholder="e.g., Weekly" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="maintenanceRequired" checked={formData.maintenanceRequired} onChange={handleInputChange} className="w-4 h-4 rounded accent-primary" />
                <label className="text-sm text-foreground">Maintenance Required</label>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" maxLength={500} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Repair History</label>
              <textarea name="repairHistory" value={formData.repairHistory} onChange={handleInputChange} rows="2" maxLength={1000} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="h-10 px-5 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase hover:brightness-110 transition-all">{editingId ? "Save Changes" : "Add Item"}</button>
              <button type="button" className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table Container (EFM Replica) ── */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        {/* Toolbar — matches EFM */}
        <div className="tack-inventory-toolbar flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder={t("Search items or horse...")}
              className="h-9 pl-8 pr-8 w-full rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            {search && <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleDownloadExcel} className="btn-download tack-inventory-export h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <span className="text-xs text-muted-foreground mono-data hidden sm:block">{items.length} of {items.length} items</span>
          </div>
        </div>

        {/* Table */}
        {loading ? <div className="p-4"><TableSkeleton cols={10} rows={5} /></div> : items.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{search ? `No items matching "${search}"` : "No tack items found."}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border">
                    {['ITEM NAME', 'CATEGORY', 'HORSE / SCOPE', 'QTY', 'CONDITION', 'BRAND', 'LOCATION', 'LAST USED', ''].map(h => (
                      <th key={h || 'actions'} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(item => {
                    const cs = conditionStyle[item.condition] || conditionStyle.Good;
                    const catCls = categoryStyle[item.category] || 'bg-muted text-muted-foreground';
                    return (
                      <tr key={item.id} className={`border-b border-border/50 hover:bg-surface-container-high/50 transition-colors ${item.condition === 'Damaged' ? 'bg-destructive/5' : item.maintenanceRequired ? 'bg-warning/5' : ''}`}>
                        {/* Name with avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-foreground shrink-0">{(item.itemName || '?').charAt(0).toUpperCase()}</div>
                            <span className="font-semibold text-sm text-foreground">{item.itemName}</span>
                          </div>
                        </td>
                        {/* Category badge */}
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${catCls}`}>{item.category}</span>
                        </td>
                        {/* Horse */}
                        <td className="px-6 py-4 text-sm text-foreground">{item.horse?.name || '-'}</td>
                        {/* Qty */}
                        <td className="px-6 py-4 mono-data text-sm font-semibold text-center">{String(item.quantity).padStart(2, '0')}</td>
                        {/* Condition with dot */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase ${cs.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                            {item.condition}
                          </span>
                        </td>
                        {/* Brand */}
                        <td className="px-6 py-4 text-sm text-foreground">{item.brand || '-'}</td>
                        {/* Location */}
                        <td className="px-6 py-4 text-sm text-muted-foreground">{item.storageLocation || '-'}</td>
                        {/* Last Used */}
                        <td className="px-6 py-4 mono-data text-xs text-foreground">{formatDate(item.lastUsedDate)}</td>
                        {/* Action icons */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedItems.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-muted-foreground">No items match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination — EFM style Previous/Next + page buttons */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-t border-border">
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border border-border text-xs text-foreground font-medium disabled:opacity-30 hover:bg-surface-container-high transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> Previous
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
        title="Delete Item" message="Delete this tack item?" confirmText="Delete" confirmVariant="danger" />
    </div>
  );
};

export default TackInventoryPage;






