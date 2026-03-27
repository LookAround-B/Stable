import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { TableSkeleton } from '../components/Skeleton';
import housekeepingInventoryService from "../services/housekeepingInventoryService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { AlertTriangle, Download, Package, Plus, Search, Sparkles, X } from 'lucide-react';

const CATEGORIES = ["Cleaning Supplies", "Tools", "Consumables"];
const UNIT_TYPES = ["Liters", "Pieces", "Kg"];
const USAGE_AREAS = ["Stable", "Arena", "Wash Area"];

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
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [filterCategory, setFilterCategory] = useState("");
  const [filterArea, setFilterArea] = useState("");
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
      const data = await housekeepingInventoryService.getItems({ category: filterCategory, usageArea: filterArea, search });
      setItems(Array.isArray(data) ? data : []);
    } catch { showMsg("Failed to load housekeeping inventory", "error"); }
    finally { setLoading(false); }
  }, [filterCategory, filterArea, search]);

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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const handleDownloadExcel = () => {
    if (items.length === 0) { alert("No data"); return; }
    const data = items.map(i => ({
      "Item Name": i.itemName, "Category": i.category,
      "Qty": i.quantity, "Unit": i.unitType, "Min Stock": i.minimumStockLevel || "",
      "Reorder Alert": i.reorderAlert ? "Yes" : "No", "Usage Area": i.usageArea || "",
      "Storage": i.storageLocation || "", "Supplier": i.supplierName || "",
      "Cost/Unit": i.costPerUnit || "", "Purchase Date": formatDate(i.purchaseDate),
      "Expiry": formatDate(i.expiryDate), "Staff": i.assignedStaff?.fullName || "",
      "Notes": i.notes || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Housekeeping");
    XLSX.writeFile(wb, `HousekeepingInventory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const lowStockItems = items.filter(i => i.reorderAlert && i.minimumStockLevel && i.quantity < i.minimumStockLevel);

  if (!p.viewHousekeepingInventory) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" /> Housekeeping <span className="text-primary">Inventory</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Manage cleaning supplies, tools & consumables')}</p>
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
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-warning" /> LOW STOCK</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{lowStockItems.length}</p>
          <p className="text-xs mt-1 text-warning">Needs reorder</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> EXPIRED</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{items.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date()).length}</p>
          <p className="text-xs mt-1 text-destructive">Past expiry date</p>
        </div>
      </div>

      {/* ── Low Stock Alert ── */}
      {lowStockItems.length > 0 && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-warning/15 text-warning border border-warning/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Low Stock Alert</strong>
            <ul className="mt-1 pl-4 list-disc text-xs">
              {lowStockItems.map(i => (
                <li key={i.id}>{i.itemName}: {i.quantity} {i.unitType} remaining (min: {i.minimumStockLevel})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <h3 className="text-lg font-bold text-foreground mb-4">{editingId ? "Edit Item" : "Add Item"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Item Name *</label>
                <input type="text" name="itemName" value={formData.itemName} onChange={handleInputChange} required maxLength={100} placeholder="e.g., Floor Cleaner" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Category *</label>
                <SearchableSelect name="category" value={formData.category} onChange={handleInputChange} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Quantity</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" step="0.01" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Unit Type</label>
                <SearchableSelect name="unitType" value={formData.unitType} onChange={handleInputChange} options={UNIT_TYPES.map(u => ({ value: u, label: u }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Min Stock Level</label>
                <input type="number" name="minimumStockLevel" value={formData.minimumStockLevel} onChange={handleInputChange} min="0" step="0.01" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Usage Area</label>
                <SearchableSelect name="usageArea" value={formData.usageArea} onChange={handleInputChange} options={[{ value: '', label: '-- None --' }, ...USAGE_AREAS.map(a => ({ value: a, label: a }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Storage Location</label>
                <input type="text" name="storageLocation" value={formData.storageLocation} onChange={handleInputChange} maxLength={200} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Supplier Name</label>
                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} maxLength={200} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Cost per Unit (₹)</label>
                <input type="number" name="costPerUnit" value={formData.costPerUnit} onChange={handleInputChange} min="0" step="0.01" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Consumption Rate</label>
                <input type="text" name="consumptionRate" value={formData.consumptionRate} onChange={handleInputChange} placeholder="e.g., 2L/week" maxLength={100} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Purchase Date</label>
                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Expiry Date</label>
                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Last Restocked</label>
                <input type="date" name="lastRestockedDate" value={formData.lastRestockedDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Assigned Staff</label>
                <SearchableSelect name="assignedStaffId" value={formData.assignedStaffId} onChange={handleInputChange} options={[{ value: '', label: '-- None --' }, ...employees.map(e => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="reorderAlert" checked={formData.reorderAlert} onChange={handleInputChange} className="w-4 h-4 rounded" />
                <label className="text-sm text-foreground">Enable Reorder Alert</label>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" maxLength={500} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none" />
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
            <input type="text" placeholder="Search by name, supplier..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none h-full" />
            {search && <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <SearchableSelect value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }} options={[{ value: '', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} placeholder="All Categories" className="w-full sm:w-44" />
          <SearchableSelect value={filterArea} onChange={e => { setFilterArea(e.target.value); setCurrentPage(1); }} options={[{ value: '', label: 'All Areas' }, ...USAGE_AREAS.map(a => ({ value: a, label: a }))]} placeholder="All Areas" className="w-full sm:w-40" />
        </div>

        {/* Table */}
        {loading ? <div className="p-4"><TableSkeleton cols={10} rows={5} /></div> : items.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{search ? `No items matching "${search}"` : "No housekeeping items found."}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Area</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Supplier</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost/Unit</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expiry</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Staff</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stock</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, i) => {
                    const isLowStock = item.reorderAlert && item.minimumStockLevel && item.quantity < item.minimumStockLevel;
                    const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                    return (
                      <tr key={item.id} className={`border-b border-border/30 hover:bg-surface-container-high/50 transition-colors ${isExpired ? 'bg-destructive/5' : isLowStock ? 'bg-warning/5' : ''}`}>
                        <td className="px-4 py-4 text-muted-foreground">{startIndex + i + 1}</td>
                        <td className="px-4 py-4 font-semibold text-foreground">{item.itemName}</td>
                        <td className="px-4 py-4 text-foreground">{item.category}</td>
                        <td className="px-4 py-4 text-right mono-data text-foreground">{item.quantity}</td>
                        <td className="px-4 py-4 text-foreground">{item.unitType}</td>
                        <td className="px-4 py-4 text-foreground">{item.usageArea || "-"}</td>
                        <td className="px-4 py-4 text-foreground">{item.supplierName || "-"}</td>
                        <td className="px-4 py-4 text-right mono-data text-foreground">{item.costPerUnit ? `₹${parseFloat(item.costPerUnit).toFixed(2)}` : "-"}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {item.expiryDate ? (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${isExpired ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'}`}>
                              {formatDate(item.expiryDate)}{isExpired && ' [EXP]'}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-4 text-xs text-foreground">{item.assignedStaff?.fullName || "-"}</td>
                        <td className="px-4 py-4">
                          {isLowStock ? <span className="text-warning font-semibold text-xs">LOW</span> : <span className="text-muted-foreground text-xs">OK</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button className="text-xs text-primary hover:underline font-medium" onClick={() => handleEdit(item)}>Edit</button>
                            <button className="text-xs text-destructive hover:underline font-medium" onClick={() => handleDelete(item.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
        title="Delete Item" message="Delete this housekeeping item?" confirmText="Delete" confirmVariant="danger" />
    </div>
  );
};

export default HousekeepingInventoryPage;


