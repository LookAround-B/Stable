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
import { Download } from 'lucide-react';

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

  if (!p.viewTackInventory) return <Navigate to="/" replace />;

  return (
    <div className="page-container" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1>🐴 {t('Tack Inventory')}</h1>
          <p>{t('Manage saddles, bridles, grooming gear & training equipment')}</p>
        </div>
      </div>

      {message && <div className={`alert alert-${messageType === "error" ? "error" : "success"}`} style={{ marginBottom: "16px" }}>{message}</div>}

      {/* Add Item Button */}
      <div style={{ marginBottom: "16px" }}>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }}>
          {showForm && !editingId ? "✕ Cancel" : "+ Add Item"}
        </button>
      </div>

      {/* Filters */}
      <div className="groceries-filters">
        <div className="filter-group">
          <label>Category</label>
          <SearchableSelect value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} placeholder="All..." />
        </div>
        <div className="filter-group">
          <label>Condition</label>
          <SearchableSelect value={filterCondition} onChange={e => { setFilterCondition(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Conditions' }, ...CONDITIONS.map(c => ({ value: c, label: c }))]} placeholder="All..." />
        </div>
      </div>

      {/* Search + Download */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ fontSize: "0.9rem", display: "block", marginBottom: "8px", fontWeight: 500 }}>Search</label>
          <input type="text" placeholder="Search by name, brand..." value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
        </div>
        <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
      </div>

      {/* Maintenance alerts */}
      {items.some(i => i.maintenanceRequired) && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#92400e' }}>
          <strong>⚠ Maintenance Required</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '16px', fontSize: '0.85rem' }}>
            {items.filter(i => i.maintenanceRequired).map(i => (
              <li key={i.id}>{i.itemName} ({i.category}) — {i.condition}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="groceries-summary">
        <div className="groceries-summary-card"><div className="groceries-summary-label">Total Items</div><div className="groceries-summary-value">{items.length}</div></div>
        <div className="groceries-summary-card"><div className="groceries-summary-label">Need Maintenance</div><div className="groceries-summary-value">{items.filter(i => i.maintenanceRequired).length}</div></div>
        <div className="groceries-summary-card"><div className="groceries-summary-label">Damaged</div><div className="groceries-summary-value">{items.filter(i => i.condition === 'Damaged').length}</div></div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1rem" }}>{editingId ? "Edit Tack Item" : "Add Tack Item"}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Item Name *</label>
                <input type="text" name="itemName" value={formData.itemName} onChange={handleInputChange}
                  required maxLength={100} placeholder="e.g., English Saddle"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Category *</label>
                <SearchableSelect name="category" value={formData.category} onChange={handleInputChange}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Assigned Horse</label>
                <SearchableSelect name="horseId" value={formData.horseId} onChange={handleInputChange}
                  options={[{ value: '', label: '-- None --' }, ...horses.map(h => ({ value: h.id, label: `${h.name} (#${h.stableNumber || ''})` }))]} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Assigned Rider</label>
                <SearchableSelect name="riderId" value={formData.riderId} onChange={handleInputChange}
                  options={[{ value: '', label: '-- None --' }, ...employees.map(e => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Quantity</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Condition</label>
                <SearchableSelect name="condition" value={formData.condition} onChange={handleInputChange}
                  options={CONDITIONS.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Brand</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} maxLength={100}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Size</label>
                <input type="text" name="size" value={formData.size} onChange={handleInputChange} maxLength={50}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Material</label>
                <input type="text" name="material" value={formData.material} onChange={handleInputChange} maxLength={100}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Purchase Date</label>
                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Last Used Date</label>
                <input type="date" name="lastUsedDate" value={formData.lastUsedDate} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Storage Location</label>
                <input type="text" name="storageLocation" value={formData.storageLocation} onChange={handleInputChange} maxLength={200}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Cleaning Schedule</label>
                <input type="text" name="cleaningSchedule" value={formData.cleaningSchedule} onChange={handleInputChange} maxLength={200}
                  placeholder="e.g., Weekly" style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "24px" }}>
                <input type="checkbox" name="maintenanceRequired" checked={formData.maintenanceRequired} onChange={handleInputChange} />
                <label style={{ fontSize: "0.85rem" }}>Maintenance Required</label>
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" maxLength={500}
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Repair History</label>
              <textarea name="repairHistory" value={formData.repairHistory} onChange={handleInputChange} rows="2" maxLength={1000}
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
      {loading ? <TableSkeleton cols={10} rows={5} /> : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          {search ? `No items matching "${search}"` : "No tack items found."}
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.15)" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>#</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Item Name</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Category</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Horse</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Rider</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, opacity: 0.8 }}>Qty</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Condition</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Brand</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Storage</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Maint.</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", ...(item.condition === 'Damaged' ? { background: 'rgba(239,68,68,0.08)' } : item.maintenanceRequired ? { background: 'rgba(245,158,11,0.08)' } : {}) }}>
                    <td style={{ padding: "10px 12px", opacity: 0.5 }}>{startIndex + i + 1}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{item.itemName}</td>
                    <td style={{ padding: "10px 12px" }}>{item.category}</td>
                    <td style={{ padding: "10px 12px" }}>{item.horse?.name || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>{item.rider?.fullName || "-"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500,
                        background: item.condition === 'New' ? 'rgba(34,197,94,0.15)' : item.condition === 'Good' ? 'rgba(59,130,246,0.15)' : item.condition === 'Worn' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        color: item.condition === 'New' ? '#16a34a' : item.condition === 'Good' ? '#2563eb' : item.condition === 'Worn' ? '#d97706' : '#dc2626',
                      }}>{item.condition}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{item.brand || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>{item.storageLocation || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>{item.maintenanceRequired ? <span style={{ color: '#d97706', fontWeight: 600 }}>Yes</span> : "-"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="btn btn-sm btn-edit" onClick={() => handleEdit(item)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Edit</button>
                        <button className="btn btn-sm btn-delete" onClick={() => handleDelete(item.id)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage} onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }} totalRows={items.length} />
        </>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Item" message="Delete this tack item?" confirmText="Delete" confirmVariant="danger" />
    </div>
  );
};

export default TackInventoryPage;
