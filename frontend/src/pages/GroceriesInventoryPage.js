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
import { Download } from 'lucide-react';

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

  if (!p.viewGroceriesInventory) return <Navigate to="/" replace />;

  return (
    <div className="page-container" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px', marginBottom: '2px' }}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>{t('Groceries Inventory')}</h1>
          <p>{t('Track grocery items and purchases')}</p>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${messageType === "error" ? "error" : "success"}`} style={{ marginBottom: "16px" }}>
          {message}
        </div>
      )}

      {/* Filters */}
      <div className="groceries-filters">
        <div className="filter-group">
          <label>Month</label>
          <SearchableSelect
            value={selectedMonth.toString()}
            onChange={e => { setSelectedMonth(parseInt(e.target.value)); setCurrentPage(1); }}
            options={MONTH_NAMES.map((m, i) => ({ value: (i+1).toString(), label: m }))}
            placeholder="Select month..."
          />
        </div>
        <div className="filter-group">
          <label>Year</label>
          <SearchableSelect
            value={selectedYear.toString()}
            onChange={e => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }}
            options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
            placeholder="Select year..."
          />
        </div>
        <div className="filter-group groceries-search-group">
          <label>Search</label>
          <input type="text" placeholder="Search by item name..." value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
        <div className="groceries-filter-actions">
          <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }}>
            {showForm && !editingId ? "✕ Cancel" : "+ Add Item"}
          </button>
        </div>
      </div>

      <InventoryCharts type="groceries" records={filteredGroceries} />

      {groceries.some(g => g.threshold !== null && g.threshold !== undefined && g.notifyAdmin && g.quantity < g.threshold) && (
        <div style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#374151', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>!</span>
          <div>
            <strong>Low stock alert</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '16px', fontSize: '0.85rem' }}>
              {groceries.filter(g => g.threshold !== null && g.threshold !== undefined && g.notifyAdmin && g.quantity < g.threshold).map(g => (
                <li key={g.id}>{g.name}: {g.quantity} {g.unit} remaining (threshold: {g.threshold} {g.unit})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="groceries-summary">
        <div className="groceries-summary-card">
          <div className="groceries-summary-label">Total Items</div>
          <div className="groceries-summary-value">{filteredGroceries.length}</div>
        </div>
        <div className="groceries-summary-card">
          <div className="groceries-summary-label">Total Value</div>
          <div className="groceries-summary-value">₹{totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1rem" }}>{editingId ? "Edit Grocery Item" : "Add Grocery Item"}</h3>
          
          {!editingId && (
            <div style={{ marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontSize: "0.8rem", display: "block", marginBottom: "8px", fontWeight: 500 }}>Item Entry Method</div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className={`mode-btn ${formMode === 'select' ? 'active' : ''}`}
                  onClick={() => { setFormMode('select'); setFormData(prev => ({ ...prev, name: '', quantity: '', unit: 'g' })); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${formMode === 'select' ? '#333' : 'rgba(0,0,0,0.2)'}`,
                    background: formMode === 'select' ? 'rgba(0,0,0,0.08)' : 'transparent',
                    color: formMode === 'select' ? '#000' : '#999',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: formMode === 'select' ? 600 : 400,
                    transition: 'all 0.2s'
                  }}
                >
                  Select Existing Item
                </button>
                <button
                  type="button"
                  className={`mode-btn ${formMode === 'new' ? 'active' : ''}`}
                  onClick={() => { setFormMode('new'); }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: `1px solid ${formMode === 'new' ? '#333' : 'rgba(0,0,0,0.2)'}`,
                    background: formMode === 'new' ? 'rgba(0,0,0,0.08)' : 'transparent',
                    color: formMode === 'new' ? '#000' : '#999',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: formMode === 'new' ? 600 : 400,
                    transition: 'all 0.2s'
                  }}
                >
                  Add New Item
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* SELECT MODE */}
            {formMode === 'select' && itemSuggestions.length > 0 && (
              <div style={{ marginBottom: "20px", padding: "16px", background: "rgba(0,0,0,0.04)", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)" }}>
                <label style={{ fontSize: "0.85rem", display: "block", marginBottom: "8px", fontWeight: 600, color: "#333" }}>Select an Item from History</label>
                <SearchableSelect
                  value={formData.name}
                  onChange={(e) => {
                    const match = itemSuggestions.find(s => s.name === e.target.value);
                    if (match) {
                      setFormData(prev => ({ 
                        ...prev, 
                        name: match.name, 
                        unit: match.unit,
                        quantity: '',
                        price: ''
                      }));
                    }
                  }}
                  options={[{ value: '', label: '-- Choose an item --' }, ...itemSuggestions.map(s => ({ value: s.name, label: `${s.name} (${s.unit})` }))]}
                  placeholder="Search and select item..."
                  style={{ width: '100%' }}
                />
                <p style={{ fontSize: '0.75rem', color: '#666', margin: '8px 0 0' }}>Unit will be pre-filled from previous entries</p>
              </div>
            )}

            {/* FORM FIELDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              {formMode === 'new' && (
                <div>
                  <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Item Name *</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                    placeholder="e.g., Rice, Flour" required maxLength={100}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
                </div>
              )}

              {formMode === 'select' && (
                <div>
                  <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Selected Item</label>
                  <input type="text" value={formData.name} disabled
                    placeholder="No item selected"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box", background: '#f5f5f5', opacity: 0.7 }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Quantity *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                  placeholder="e.g., 500" step="0.01" min="0" required
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Unit</label>
                <SearchableSelect
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  options={UNIT_OPTIONS.map(u => ({ value: u, label: u }))}
                  placeholder="Select unit..."
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Price per Unit (₹)</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange}
                  placeholder="Optional" step="0.01" min="0"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Purchase Date</label>
                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>

              <div style={{ background: "rgba(0,0,0,0.04)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.1)" }}>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px", fontWeight: 600, color: "#333" }}>Expiry Date (Optional)</label>
                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Assigned To</label>
                <SearchableSelect
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  options={[{ value: '', label: '-- None --' }, ...employees.map((e) => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]}
                  placeholder="Select employee..."
                />
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Description / Notes</label>
              <textarea name="description" value={formData.description} onChange={handleInputChange}
                placeholder="Optional notes" rows="2" maxLength={500}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="submit" className="btn btn-primary">{editingId ? "Update" : "Add Item"}</button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton cols={8} rows={5} />
      ) : filteredGroceries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          {search ? `No items matching "${search}"` : `No grocery entries for ${MONTH_NAMES[selectedMonth-1]} ${selectedYear}.`}
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.15)" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>#</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Date</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Item Name</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, opacity: 0.8 }}>Quantity</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Unit</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, opacity: 0.8 }}>Price/Unit</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, opacity: 0.8 }}>Total</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Expiry</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Description</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Added By</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Threshold</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((g, i) => {
                  const isBelowThreshold = g.threshold !== null && g.threshold !== undefined && g.quantity < g.threshold;
                  const isExpired = g.expiryDate && new Date(g.expiryDate) < new Date();
                  const daysUntilExpiry = g.expiryDate ? Math.ceil((new Date(g.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                  <tr key={g.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", ...(isBelowThreshold ? { background: 'rgba(239,68,68,0.08)' } : isExpired ? { background: 'rgba(220,38,38,0.12)' } : {}) }}>
                    <td style={{ padding: "10px 12px", opacity: 0.5 }}>{startIndex + i + 1}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDate(g.purchaseDate || g.createdAt)}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{g.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{g.quantity}</td>
                    <td style={{ padding: "10px 12px" }}>{g.unit}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{g.price > 0 ? `₹${g.price.toFixed(2)}` : "-"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{g.totalPrice > 0 ? `₹${g.totalPrice.toFixed(2)}` : "-"}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontWeight: g.expiryDate ? 600 : 400 }}>
                      {g.expiryDate ? (
                        <span style={{
                          color: isExpired ? '#dc2626' : daysUntilExpiry <= 7 ? '#666' : '#333',
                          background: isExpired ? 'rgba(220,38,38,0.1)' : daysUntilExpiry <= 7 ? 'rgba(0,0,0,0.05)' : 'transparent',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          fontSize: '0.8rem'
                        }}>
                          {formatDate(g.expiryDate)}
                          {isExpired && ' [EXPIRED]'}
                          {!isExpired && daysUntilExpiry <= 7 && ` [${daysUntilExpiry}d]`}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.5 }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.description || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.8rem", opacity: 0.8 }}>{g.createdBy?.fullName || "-"}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: 'nowrap' }}>
                      {g.threshold !== null && g.threshold !== undefined
                        ? <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{g.threshold} {g.unit}</span>
                        : <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>—</span>
                      }
                      {isBelowThreshold && <span style={{ marginLeft: 4, color: '#dc2626', fontWeight: 700 }} title="Below threshold">!</span>}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-edit" onClick={() => handleEdit(g)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Edit</button>
                        <button className="btn btn-sm btn-delete" onClick={() => handleDelete(g.id)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Delete</button>
                        {isAdmin && (
                          <button
                            style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'transparent', color: '#333', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                            onClick={() => setThresholdModal({ record: g, value: g.threshold ?? '', notifyAdmin: g.notifyAdmin ?? false })}
                            title="Configure threshold alert"
                          >
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }}
            totalRows={filteredGroceries.length}
          />
        </>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Entry"
        message="Delete this grocery entry?"
        confirmText="Delete"
        confirmVariant="danger"
      />

      {thresholdModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card, #fff)', borderRadius: '12px', padding: '24px', width: '340px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>Set Threshold Alert</h3>
            <p style={{ margin: '0 0 16px', opacity: 0.6, fontSize: '0.8rem' }}>{thresholdModal.record.name}</p>
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
              <button className="btn-primary" onClick={handleSaveThreshold}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroceriesInventoryPage;
