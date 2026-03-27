import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import InventoryCharts from '../components/InventoryCharts';
import { TableSkeleton } from '../components/Skeleton';
import groceriesInventoryService from "../services/groceriesInventoryService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Download, IndianRupee, Package, Plus, Search, ShoppingCart, X } from 'lucide-react';

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const UNIT_OPTIONS = ["g","kg","ml","l","ltr","pcs","units","packets","packs","boxes","bottles","cans","jars","sachets","strips"];

const GroceriesInventoryPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const { user } = useAuth();
  const isAdmin = ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  const [groceries, setGroceries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [itemSuggestions, setItemSuggestions] = useState([]); // [{name, unit}]
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState('new'); // 'select' or 'new'

  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "g",
    price: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    description: "",
    employeeId: "",
  });

  const showMsg = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const fetchGroceries = useCallback(async () => {
    try {
      setLoading(true);
      setCurrentPage(1);
      const data = await groceriesInventoryService.getGroceries({
        month: selectedMonth,
        year: selectedYear,
      });
      setGroceries(Array.isArray(data) ? data : []);
    } catch (err) {
      showMsg("Failed to load groceries", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      const list = response.data?.data || response.data || response || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch { setEmployees([]); }
  };

  const fetchItemSuggestions = async () => {
    try {
      const data = await groceriesInventoryService.getItemSuggestions();
      setItemSuggestions(Array.isArray(data) ? data : []);
    } catch { setItemSuggestions([]); }
  };

  useEffect(() => { fetchGroceries(); }, [fetchGroceries]);
  useEffect(() => { fetchEmployees(); fetchItemSuggestions(); }, []);

  const filteredGroceries = groceries.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredGroceries.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = filteredGroceries.slice(startIndex, startIndex + rowsPerPage);

  const totalValue = groceries.reduce((s, g) => s + (g.totalPrice || 0), 0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: "", quantity: "", unit: "g", price: "", purchaseDate: new Date().toISOString().split("T")[0], expiryDate: "", description: "", employeeId: "" });
    setFormMode('new');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.quantity) { showMsg("Name and quantity are required", "error"); return; }
    try {
      if (editingId) {
        await groceriesInventoryService.updateGrocery(editingId, formData);
        showMsg("Grocery updated successfully");
      } else {
        await groceriesInventoryService.createGrocery(formData);
        showMsg("Grocery added successfully");
      }
      resetForm();
      fetchGroceries();
      fetchItemSuggestions();
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to save grocery", "error");
    }
  };

  const handleEdit = (g) => {
    const pd = g.purchaseDate ? new Date(g.purchaseDate).toISOString().split("T")[0]
               : new Date(g.createdAt).toISOString().split("T")[0];
    const ed = g.expiryDate ? new Date(g.expiryDate).toISOString().split("T")[0] : "";
    setFormData({
      name: g.name,
      quantity: g.quantity,
      unit: g.unit,
      price: g.price || "",
      purchaseDate: pd,
      expiryDate: ed,
      description: g.description || "",
      employeeId: g.employeeId || "",
    });
    setEditingId(g.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      await groceriesInventoryService.deleteGrocery(id);
      showMsg("Deleted successfully");
      fetchGroceries();
    } catch { showMsg("Failed to delete", "error"); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  // Threshold modal state (admin only)
  const [thresholdModal, setThresholdModal] = useState(null);

  const handleSaveThreshold = async () => {
    if (!thresholdModal) return;
    try {
      await groceriesInventoryService.setThreshold(
        thresholdModal.record.id,
        thresholdModal.value === '' ? null : parseFloat(thresholdModal.value),
        thresholdModal.notifyAdmin
      );
      showMsg('Threshold updated');
      setThresholdModal(null);
      fetchGroceries();
    } catch { showMsg('Failed to update threshold', 'error'); }
  };

  const handleDownloadExcel = () => {
    if (filteredGroceries.length === 0) { alert("No data to download"); return; }
    const data = filteredGroceries.map(g => ({
      "Date": formatDate(g.purchaseDate || g.createdAt),
      "Item Name": g.name,
      "Quantity": g.quantity,
      "Unit": g.unit,
      "Price/Unit (₹)": g.price || 0,
      "Total (₹)": g.totalPrice || 0,      "Expiry Date": g.expiryDate ? formatDate(g.expiryDate) : "",      "Description": g.description || "",
      "Added By": g.createdBy?.fullName || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 12 },{ wch: 25 },{ wch: 10 },{ wch: 10 },{ wch: 15 },{ wch: 12 },{ wch: 14 },{ wch: 25 },{ wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Groceries");
    XLSX.writeFile(wb, `GroceriesInventory_${MONTH_NAMES[selectedMonth-1]}_${selectedYear}.xlsx`);
  };

  const years = [];
  for (let y = 2024; y <= new Date().getFullYear() + 1; y++) years.push(y);

  if (!p.viewGroceriesInventory) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary" /> Groceries <span className="text-primary">Inventory</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Track grocery items and purchases')}</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><Package className="w-3.5 h-3.5 text-primary" /> TOTAL ITEMS</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">{filteredGroceries.length}</p>
          <p className="text-xs mt-1 text-muted-foreground">{MONTH_NAMES[selectedMonth-1]} {selectedYear}</p>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5 text-success" /> TOTAL VALUE</p>
          <p className="text-4xl font-bold text-foreground mt-2 mono-data">₹{totalValue.toFixed(2)}</p>
          <p className="text-xs mt-1 text-muted-foreground">Combined purchase value</p>
        </div>
      </div>

      {/* ── Month/Year Filter Pills ── */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchableSelect
          value={selectedMonth.toString()}
          onChange={e => { setSelectedMonth(parseInt(e.target.value)); setCurrentPage(1); }}
          options={MONTH_NAMES.map((m, i) => ({ value: (i+1).toString(), label: m }))}
          placeholder="Month"
          className="w-36"
        />
        <SearchableSelect
          value={selectedYear.toString()}
          onChange={e => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }}
          options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
          placeholder="Year"
          className="w-28"
        />
      </div>

      <InventoryCharts type="groceries" records={filteredGroceries} />

      {/* ── Low Stock Alert ── */}
      {groceries.some(g => g.threshold !== null && g.threshold !== undefined && g.notifyAdmin && g.quantity < g.threshold) && (
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-destructive/15 text-destructive border border-destructive/30 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Low stock alert</strong>
            <ul className="mt-1 pl-4 list-disc text-xs">
              {groceries.filter(g => g.threshold !== null && g.threshold !== undefined && g.notifyAdmin && g.quantity < g.threshold).map(g => (
                <li key={g.id}>{g.name}: {g.quantity} {g.unit} remaining (threshold: {g.threshold} {g.unit})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="bg-surface-container-highest rounded-xl p-6 edge-glow border border-primary/10">
          <h3 className="text-lg font-bold text-foreground mb-4">{editingId ? "Edit Grocery Item" : "Add Grocery Item"}</h3>

          {!editingId && (
            <div className="mb-5 pb-4 border-b border-border">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Item Entry Method</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setFormMode('select'); setFormData(prev => ({ ...prev, name: '', quantity: '', unit: 'g' })); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${formMode === 'select' ? 'border-primary/30 bg-primary/15 text-primary font-bold' : 'border-border bg-surface-container-high text-muted-foreground'}`}>
                  Select Existing Item
                </button>
                <button type="button" onClick={() => { setFormMode('new'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${formMode === 'new' ? 'border-primary/30 bg-primary/15 text-primary font-bold' : 'border-border bg-surface-container-high text-muted-foreground'}`}>
                  Add New Item
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {formMode === 'select' && itemSuggestions.length > 0 && (
              <div className="p-4 rounded-lg bg-surface-container-high border border-border">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Select an Item from History</label>
                <SearchableSelect
                  value={formData.name}
                  onChange={(e) => {
                    const match = itemSuggestions.find(s => s.name === e.target.value);
                    if (match) {
                      setFormData(prev => ({ ...prev, name: match.name, unit: match.unit, quantity: '', price: '' }));
                    }
                  }}
                  options={[{ value: '', label: '-- Choose an item --' }, ...itemSuggestions.map(s => ({ value: s.name, label: `${s.name} (${s.unit})` }))]}
                  placeholder="Search and select item..."
                />
                <p className="text-[10px] text-muted-foreground mt-2">Unit will be pre-filled from previous entries</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {formMode === 'new' && (
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Item Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Rice, Flour" required maxLength={100} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                </div>
              )}
              {formMode === 'select' && (
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Selected Item</label>
                  <input type="text" value={formData.name} disabled placeholder="No item selected" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-muted-foreground text-sm outline-none opacity-80" />
                </div>
              )}
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Quantity *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="e.g., 500" step="0.01" min="0" required className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Unit</label>
                <SearchableSelect name="unit" value={formData.unit} onChange={handleInputChange} options={UNIT_OPTIONS.map(u => ({ value: u, label: u }))} placeholder="Select unit..." />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Price per Unit (₹)</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="Optional" step="0.01" min="0" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Purchase Date</label>
                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Expiry Date (Optional)</label>
                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Assigned To</label>
                <SearchableSelect name="employeeId" value={formData.employeeId} onChange={handleInputChange} options={[{ value: '', label: '-- None --' }, ...employees.map((e) => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]} placeholder="Select employee..." />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Description / Notes</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Optional notes" rows="2" maxLength={500} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none" />
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
            <input type="text" placeholder="Search by item name..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none h-full" />
            {search && <button onClick={() => { setSearch(''); setCurrentPage(1); }} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>

        {/* Table */}
        {loading ? <div className="p-4"><TableSkeleton cols={8} rows={5} /></div> : filteredGroceries.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{search ? `No items matching "${search}"` : `No grocery entries for ${MONTH_NAMES[selectedMonth-1]} ${selectedYear}.`}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Item Name</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quantity</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price/Unit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expiry</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Added By</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Threshold</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((g, i) => {
                    const isBelowThreshold = g.threshold !== null && g.threshold !== undefined && g.quantity < g.threshold;
                    const isExpired = g.expiryDate && new Date(g.expiryDate) < new Date();
                    const daysUntilExpiry = g.expiryDate ? Math.ceil((new Date(g.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    return (
                    <tr key={g.id} className={`border-b border-border/30 hover:bg-surface-container-high/50 transition-colors ${isBelowThreshold ? 'bg-destructive/5' : isExpired ? 'bg-destructive/8' : ''}`}>
                      <td className="px-4 py-4 text-muted-foreground">{startIndex + i + 1}</td>
                      <td className="px-4 py-4 text-foreground whitespace-nowrap">{formatDate(g.purchaseDate || g.createdAt)}</td>
                      <td className="px-4 py-4 font-semibold text-foreground">{g.name}</td>
                      <td className="px-4 py-4 text-right mono-data text-foreground">{g.quantity}</td>
                      <td className="px-4 py-4 text-foreground">{g.unit}</td>
                      <td className="px-4 py-4 text-right mono-data text-foreground">{g.price > 0 ? `₹${g.price.toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-4 text-right mono-data text-foreground font-semibold">{g.totalPrice > 0 ? `₹${g.totalPrice.toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {g.expiryDate ? (
                          <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${isExpired ? 'bg-destructive/20 text-destructive' : daysUntilExpiry <= 7 ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                            {formatDate(g.expiryDate)}
                            {isExpired && ' [EXPIRED]'}
                            {!isExpired && daysUntilExpiry <= 7 && ` [${daysUntilExpiry}d]`}
                          </span>
                        ) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-4 text-foreground max-w-[200px] truncate">{g.description || "-"}</td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">{g.createdBy?.fullName || "-"}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {g.threshold !== null && g.threshold !== undefined
                          ? <span className="mono-data text-xs">{g.threshold} {g.unit}</span>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                        {isBelowThreshold && <span className="ml-1 text-destructive font-bold" title="Below threshold">!</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button className="text-xs text-primary hover:underline font-medium" onClick={() => handleEdit(g)}>Edit</button>
                          <button className="text-xs text-destructive hover:underline font-medium" onClick={() => handleDelete(g.id)}>Delete</button>
                          {isAdmin && (
                            <button className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-colors font-semibold"
                              onClick={() => setThresholdModal({ record: g, value: g.threshold ?? '', notifyAdmin: g.notifyAdmin ?? false })}
                              title="Configure threshold alert">
                              Alert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-border">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} rowsPerPage={rowsPerPage} onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }} totalRows={filteredGroceries.length} />
            </div>
          </>
        )}
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Entry" message="Delete this grocery entry?" confirmText="Delete" confirmVariant="danger" />

      {/* ── Threshold Modal ── */}
      {thresholdModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container-highest rounded-xl p-6 w-[340px] edge-glow border border-border">
            <h3 className="text-lg font-bold text-foreground mb-1">Set Threshold Alert</h3>
            <p className="text-xs text-muted-foreground mb-4">{thresholdModal.record.name}</p>
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Threshold quantity ({thresholdModal.record.unit})</label>
            <input type="number" min="0" step="0.01" placeholder="Leave empty to disable" value={thresholdModal.value}
              onChange={e => setThresholdModal(prev => ({ ...prev, value: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none mb-3" />
            <label className="flex items-center gap-2 text-sm text-foreground mb-5 cursor-pointer">
              <input type="checkbox" checked={thresholdModal.notifyAdmin} onChange={e => setThresholdModal(prev => ({ ...prev, notifyAdmin: e.target.checked }))} className="w-4 h-4 rounded" />
              Notify admin when below threshold
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setThresholdModal(null)} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
              <button onClick={handleSaveThreshold} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroceriesInventoryPage;
