import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { TableSkeleton } from '../components/Skeleton';
import tackInventoryService from "../services/tackInventoryService";
import { getHorses } from "../services/horseService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { AlertTriangle, Download, Package, Plus, Search, Wrench, X } from 'lucide-react';

const CATEGORIES = ["Saddle", "Bridle", "Grooming Gear", "Training Equipment"];
const CONDITIONS = ["New", "Good", "Worn", "Damaged"];

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
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
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
      const data = await tackInventoryService.getItems({ category: filterCategory, condition: filterCondition, search });
      setItems(Array.isArray(data) ? data : []);
    } catch { showMsg("Failed to load tack inventory", "error"); }
    finally { setLoading(false); }
  }, [filterCategory, filterCondition, search]);

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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

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

  if (!p.viewTackInventory) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tack <span className="text-primary">Inventory</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Manage saddles, bridles, grooming gear & training equipment')}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleDownloadExcel} className="h-10 px-4 sm:px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }} className="h-10 px-4 sm:px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
            {showForm && !editingId ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Item</>}
          </button>
        </div>
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === "error" ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {messageType === 'success' ? '✓' : '✕'} {message}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><Package className="w-3.5 h-3.5 text-primary" /> TOTAL ITEMS</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{items.length}</p>
          <p className="text-xs mt-1 text-muted-foreground">Across all categories</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-warning" /> NEEDS MAINTENANCE</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{items.filter(i => i.maintenanceRequired).length}</p>
          <p className="text-xs mt-1 text-warning">Requires attention</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> DAMAGED</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{items.filter(i => i.condition === 'Damaged').length}</p>
          <p className="text-xs mt-1 text-destructive">Needs replacement</p>
        </div>
      </div>

      {/* ── Maintenance Alert ── */}
      {items.some(i => i.maintenanceRequired) && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-warning/15 text-warning border border-warning/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> <strong>Maintenance Required:</strong> {items.filter(i => i.maintenanceRequired).map(i => i.itemName).join(', ')}
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
                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} maxLength={100} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
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
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Storage Location</label>
                <input type="text" name="storageLocation" value={formData.storageLocation} onChange={handleInputChange} maxLength={200} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Cleaning Schedule</label>
                <input type="text" name="cleaningSchedule" value={formData.cleaningSchedule} onChange={handleInputChange} maxLength={200} placeholder="e.g., Weekly" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="maintenanceRequired" checked={formData.maintenanceRequired} onChange={handleInputChange} className="w-4 h-4 rounded" />
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
              <button type="submit" className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">{editingId ? "Update" : "Add Item"}</button>
              <button type="button" className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table Container ── */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex-1 flex items-center gap-2 px-4 h-11 rounded-lg border border-border bg-background">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input type="text" placeholder="Search by name, brand..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none h-full" />
            {search && <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <SearchableSelect value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }} options={[{ value: '', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} placeholder="All Categories" className="w-full sm:w-44" />
          <SearchableSelect value={filterCondition} onChange={e => { setFilterCondition(e.target.value); setCurrentPage(1); }} options={[{ value: '', label: 'All Conditions' }, ...CONDITIONS.map(c => ({ value: c, label: c }))]} placeholder="All Conditions" className="w-full sm:w-44" />
        </div>

        {/* Table */}
        {loading ? <div className="p-4"><TableSkeleton cols={10} rows={5} /></div> : items.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{search ? `No items matching "${search}"` : "No tack items found."}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Horse</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rider</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Condition</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Storage</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Maint.</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, i) => (
                    <tr key={item.id} className={`border-b border-border/30 hover:bg-surface-container-high/50 transition-colors ${item.condition === 'Damaged' ? 'bg-destructive/5' : item.maintenanceRequired ? 'bg-warning/5' : ''}`}>
                      <td className="px-4 py-4 text-muted-foreground">{startIndex + i + 1}</td>
                      <td className="px-4 py-4 font-semibold text-foreground">{item.itemName}</td>
                      <td className="px-4 py-4 text-foreground">{item.category}</td>
                      <td className="px-4 py-4 text-foreground">{item.horse?.name || "-"}</td>
                      <td className="px-4 py-4 text-foreground">{item.rider?.fullName || "-"}</td>
                      <td className="px-4 py-4 text-right mono-data text-foreground">{item.quantity}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                          item.condition === 'New' ? 'bg-success/20 text-success' :
                          item.condition === 'Good' ? 'bg-primary/20 text-primary' :
                          item.condition === 'Worn' ? 'bg-warning/20 text-warning' :
                          'bg-destructive/20 text-destructive'
                        }`}>{item.condition?.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-4 text-foreground">{item.brand || "-"}</td>
                      <td className="px-4 py-4 text-foreground">{item.storageLocation || "-"}</td>
                      <td className="px-4 py-4">{item.maintenanceRequired ? <span className="text-warning font-semibold text-xs">YES</span> : <span className="text-muted-foreground text-xs">—</span>}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button className="text-xs text-primary hover:underline font-medium" onClick={() => handleEdit(item)}>Edit</button>
                          <button className="text-xs text-destructive hover:underline font-medium" onClick={() => handleDelete(item.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-border">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }} totalRows={items.length} />
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

