import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { TableSkeleton } from '../components/Skeleton';
import farrierInventoryService from "../services/farrierInventoryService";
import { getHorses } from "../services/horseService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Download, Plus, X, SlidersHorizontal, AlertTriangle, Pencil, Trash2, Hammer } from 'lucide-react';

const CATEGORIES = ["Tools", "Consumables"];
const CONDITIONS = ["New", "Good", "Worn", "Damaged"];

const FarrierInventoryPage = () => {
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
  const [search, setSearch] = useState("");

  const emptyForm = { itemName: "", category: "Tools", horseId: "", quantity: "1", sizeType: "", material: "", condition: "Good", lastUsedDate: "", farrierId: "", serviceDate: "", nextServiceDue: "", notes: "", replacementCycle: "", costTracking: "", supplier: "" };
  const [formData, setFormData] = useState(emptyForm);

  const showMsg = (msg, type = "success") => { setMessage(msg); setMessageType(type); setTimeout(() => setMessage(""), 5000); };

  const fetchItems = useCallback(async () => {
    try { setLoading(true); setCurrentPage(1); const data = await farrierInventoryService.getItems({ category: filterCategory, search }); setItems(Array.isArray(data) ? data : []); }
    catch { showMsg("Failed to load farrier inventory", "error"); }
    finally { setLoading(false); }
  }, [filterCategory, search]);

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

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const resetForm = () => { setFormData(emptyForm); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemName || !formData.category) { showMsg("Item name and category are required", "error"); return; }
    try {
      if (editingId) { await farrierInventoryService.updateItem(editingId, formData); showMsg("Item updated"); }
      else { await farrierInventoryService.createItem(formData); showMsg("Item added"); }
      resetForm(); fetchItems();
    } catch (err) { showMsg(err.response?.data?.error || "Failed to save", "error"); }
  };

  const handleEdit = (item) => {
    setFormData({
      itemName: item.itemName, category: item.category, horseId: item.horseId || "",
      quantity: item.quantity, sizeType: item.sizeType || "", material: item.material || "",
      condition: item.condition || "Good",
      lastUsedDate: item.lastUsedDate ? new Date(item.lastUsedDate).toISOString().split("T")[0] : "",
      farrierId: item.farrierId || "",
      serviceDate: item.serviceDate ? new Date(item.serviceDate).toISOString().split("T")[0] : "",
      nextServiceDue: item.nextServiceDue ? new Date(item.nextServiceDue).toISOString().split("T")[0] : "",
      notes: item.notes || "", replacementCycle: item.replacementCycle || "",
      costTracking: item.costTracking || "", supplier: item.supplier || "",
    });
    setEditingId(item.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => setConfirmModal({ isOpen: true, id });
  const confirmDelete = async () => {
    const id = confirmModal.id; setConfirmModal({ isOpen: false, id: null });
    try { await farrierInventoryService.deleteItem(id); showMsg("Deleted"); fetchItems(); }
    catch { showMsg("Failed to delete", "error"); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const handleDownloadExcel = () => {
    if (items.length === 0) { alert("No data"); return; }
    const data = items.map(i => ({ "Item Name": i.itemName, "Category": i.category, "Horse": i.horse?.name || "-", "Qty": i.quantity, "Size/Type": i.sizeType || "", "Material": i.material || "", "Condition": i.condition || "", "Last Used": formatDate(i.lastUsedDate), "Farrier": i.farrier?.fullName || "-", "Service Date": formatDate(i.serviceDate), "Next Service": formatDate(i.nextServiceDue), "Supplier": i.supplier || "", "Cost": i.costTracking || "", "Replacement Cycle": i.replacementCycle || "", "Notes": i.notes || "" }));
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(data); XLSX.utils.book_append_sheet(wb, ws, "FarrierInventory"); XLSX.writeFile(wb, `FarrierInventory_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const overdueSvc = items.filter(i => i.nextServiceDue && new Date(i.nextServiceDue) < new Date());

  const conditionBadge = (cond) => {
    const cfg = { 'New': 'border-success/30 text-success bg-success/10', 'Good': 'border-blue-500/30 text-blue-400 bg-blue-500/10', 'Worn': 'border-warning/30 text-warning bg-warning/10', 'Damaged': 'border-destructive/30 text-destructive bg-destructive/10' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cfg[cond] || 'border-border text-muted-foreground'}`}>{cond}</span>;
  };

  if (!p.viewFarrierInventory) return <Navigate to="/dashboard" replace />;

  // input helper
  const inputCls = "w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"><Hammer className="w-7 h-7 inline-block mr-2 text-primary" />Farrier <span className="text-primary">Inventory</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Track farrier tools, horseshoes & service records')}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
          {showForm && !editingId ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Item</>}
        </button>
      </div>

      {message && <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === "error" ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>{message}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Items', value: items.length },
          { label: 'Service Overdue', value: overdueSvc.length },
          { label: 'Damaged', value: items.filter(i => i.condition === 'Damaged').length },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{k.label}</p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground mt-2 mono-data">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <h3 className="text-lg font-bold text-foreground mb-4">{editingId ? "Edit Farrier Item" : "Add Farrier Item"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Item Name *</label>
                <input type="text" name="itemName" value={formData.itemName} onChange={handleInputChange} required maxLength={100} placeholder="e.g., Front Horseshoe Set" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Category *</label>
                <SearchableSelect name="category" value={formData.category} onChange={handleInputChange} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Horse</label>
                <SearchableSelect name="horseId" value={formData.horseId} onChange={handleInputChange} options={[{ value: '', label: '-- None --' }, ...horses.map(h => ({ value: h.id, label: `${h.name} (#${h.stableNumber || ''})` }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Quantity</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Size / Type</label>
                <input type="text" name="sizeType" value={formData.sizeType} onChange={handleInputChange} maxLength={50} placeholder="e.g., Size 2, Front" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Material</label>
                <input type="text" name="material" value={formData.material} onChange={handleInputChange} maxLength={100} placeholder="e.g., Steel" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Condition</label>
                <SearchableSelect name="condition" value={formData.condition} onChange={handleInputChange} options={CONDITIONS.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Farrier</label>
                <SearchableSelect name="farrierId" value={formData.farrierId} onChange={handleInputChange} options={[{ value: '', label: '-- None --' }, ...employees.filter(e => e.designation === 'Farrier' || e.designation === 'Stable Manager').map(e => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Supplier</label>
                <input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange} maxLength={200} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Cost (INR)</label>
                <input type="number" name="costTracking" value={formData.costTracking} onChange={handleInputChange} min="0" step="0.01" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Replacement Cycle</label>
                <input type="text" name="replacementCycle" value={formData.replacementCycle} onChange={handleInputChange} placeholder="e.g., Every 6 weeks" maxLength={100} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Last Used Date</label>
                <input type="date" name="lastUsedDate" value={formData.lastUsedDate} onChange={handleInputChange} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Service Date</label>
                <input type="date" name="serviceDate" value={formData.serviceDate} onChange={handleInputChange} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Next Service Due</label>
                <input type="date" name="nextServiceDue" value={formData.nextServiceDue} onChange={handleInputChange} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" maxLength={500} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="h-10 px-6 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider uppercase">{editingId ? "Update" : "Add Item"}</button>
              <button type="button" onClick={resetForm} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
        <div className="min-w-[160px]">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Category</label>
          <SearchableSelect value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }} options={[{ value: '', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} placeholder="All..." />
        </div>
        <div className="relative flex-1 max-w-sm">
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Search</label>
          <input type="text" placeholder="Search by name, supplier..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="h-10 w-full px-4 pr-10 rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all" />
          <SlidersHorizontal className="absolute right-3 bottom-2.5 w-4 h-4 text-muted-foreground" />
        </div>
        <button onClick={handleDownloadExcel} className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2 self-end"><Download className="w-4 h-4" /> Excel</button>
      </div>

      {/* Overdue Alerts */}
      {overdueSvc.length > 0 && (
        <div className="rounded-xl p-4 border border-warning/30 bg-warning/10 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">⚠ Service Overdue</p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {overdueSvc.map(i => <li key={i.id}>{i.itemName} {i.horse ? `(${i.horse.name})` : ''} — due {formatDate(i.nextServiceDue)}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <TableSkeleton cols={10} rows={5} /> : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">{search ? `No items matching "${search}"` : "No farrier items found."}</div>
      ) : (
        <>
          <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['#', 'Item', 'Category', 'Horse', 'Qty', 'Condition', 'Farrier', 'Service', 'Next Due', 'Cost', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, i) => {
                    const isOverdue = item.nextServiceDue && new Date(item.nextServiceDue) < new Date();
                    return (
                      <tr key={item.id} className={`border-b border-border/50 hover:bg-surface-container-high transition-colors ${item.condition === 'Damaged' ? 'bg-destructive/5' : isOverdue ? 'bg-warning/5' : ''}`}>
                        <td className="px-3 py-3 text-muted-foreground/50 mono-data">{startIndex + i + 1}</td>
                        <td className="px-3 py-3 font-medium text-foreground">{item.itemName}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.category}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.horse?.name || "-"}</td>
                        <td className="px-3 py-3 text-foreground mono-data text-right">{item.quantity}</td>
                        <td className="px-3 py-3">{conditionBadge(item.condition)}</td>
                        <td className="px-3 py-3 text-muted-foreground text-xs">{item.farrier?.fullName || "-"}</td>
                        <td className="px-3 py-3 text-muted-foreground text-xs mono-data whitespace-nowrap">{formatDate(item.serviceDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {item.nextServiceDue ? (
                            <span className={`text-xs mono-data ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              {formatDate(item.nextServiceDue)}{isOverdue && ' ⚠'}
                            </span>
                          ) : <span className="text-muted-foreground/40 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 text-foreground mono-data text-right">{item.costTracking ? `₹${parseFloat(item.costTracking).toFixed(2)}` : "-"}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={() => handleEdit(item)} className="h-7 px-2.5 rounded text-[10px] font-semibold border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                            <button onClick={() => handleDelete(item.id)} className="h-7 px-2.5 rounded text-[10px] font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1"><Trash2 className="w-3 h-3" /> Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }} totalRows={items.length} />
        </>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete} onCancel={() => setConfirmModal({ isOpen: false, id: null })} title="Delete Item" message="Delete this farrier inventory item?" confirmText="Delete" confirmVariant="danger" />
    </div>
  );
};

export default FarrierInventoryPage;
