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
import { Download } from 'lucide-react';

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

  if (!p.viewHousekeepingInventory) return <Navigate to="/" replace />;

  return (
    <div className="page-container" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <h1>🧹 {t('Housekeeping Inventory')}</h1>
          <p>{t('Manage cleaning supplies, tools & consumables')}</p>
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
          <label>Usage Area</label>
          <SearchableSelect value={filterArea} onChange={e => { setFilterArea(e.target.value); setCurrentPage(1); }}
            options={[{ value: '', label: 'All Areas' }, ...USAGE_AREAS.map(a => ({ value: a, label: a }))]} placeholder="All..." />
        </div>
      </div>

      {/* Search + Download */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ fontSize: "0.9rem", display: "block", marginBottom: "8px", fontWeight: 500 }}>Search</label>
          <input type="text" placeholder="Search by name, supplier..." value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
        </div>
        <button className="btn-download" onClick={handleDownloadExcel}><Download size={14} />Excel</button>
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', color: '#92400e' }}>
          <strong>⚠ Low Stock Alert</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '16px', fontSize: '0.85rem' }}>
            {lowStockItems.map(i => (
              <li key={i.id}>{i.itemName}: {i.quantity} {i.unitType} remaining (min: {i.minimumStockLevel})</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="groceries-summary">
        <div className="groceries-summary-card"><div className="groceries-summary-label">Total Items</div><div className="groceries-summary-value">{items.length}</div></div>
        <div className="groceries-summary-card"><div className="groceries-summary-label">Low Stock</div><div className="groceries-summary-value">{lowStockItems.length}</div></div>
        <div className="groceries-summary-card"><div className="groceries-summary-label">Expired</div><div className="groceries-summary-value">{items.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date()).length}</div></div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1rem" }}>{editingId ? "Edit Item" : "Add Item"}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Item Name *</label>
                <input type="text" name="itemName" value={formData.itemName} onChange={handleInputChange}
                  required maxLength={100} placeholder="e.g., Floor Cleaner"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Category *</label>
                <SearchableSelect name="category" value={formData.category} onChange={handleInputChange}
                  options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Quantity</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" step="0.01"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Unit Type</label>
                <SearchableSelect name="unitType" value={formData.unitType} onChange={handleInputChange}
                  options={UNIT_TYPES.map(u => ({ value: u, label: u }))} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Min Stock Level</label>
                <input type="number" name="minimumStockLevel" value={formData.minimumStockLevel} onChange={handleInputChange} min="0" step="0.01"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Usage Area</label>
                <SearchableSelect name="usageArea" value={formData.usageArea} onChange={handleInputChange}
                  options={[{ value: '', label: '-- None --' }, ...USAGE_AREAS.map(a => ({ value: a, label: a }))]} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Storage Location</label>
                <input type="text" name="storageLocation" value={formData.storageLocation} onChange={handleInputChange} maxLength={200}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Supplier Name</label>
                <input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} maxLength={200}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Cost per Unit (₹)</label>
                <input type="number" name="costPerUnit" value={formData.costPerUnit} onChange={handleInputChange} min="0" step="0.01"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Consumption Rate</label>
                <input type="text" name="consumptionRate" value={formData.consumptionRate} onChange={handleInputChange}
                  placeholder="e.g., 2L/week" maxLength={100}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Purchase Date</label>
                <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Expiry Date</label>
                <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Last Restocked</label>
                <input type="date" name="lastRestockedDate" value={formData.lastRestockedDate} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Assigned Staff</label>
                <SearchableSelect name="assignedStaffId" value={formData.assignedStaffId} onChange={handleInputChange}
                  options={[{ value: '', label: '-- None --' }, ...employees.map(e => ({ value: e.id, label: `${e.fullName} (${t(e.designation)})` }))]} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "24px" }}>
                <input type="checkbox" name="reorderAlert" checked={formData.reorderAlert} onChange={handleInputChange} />
                <label style={{ fontSize: "0.85rem" }}>Enable Reorder Alert</label>
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" maxLength={500}
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
          {search ? `No items matching "${search}"` : "No housekeeping items found."}
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
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, opacity: 0.8 }}>Qty</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Unit</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Area</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Supplier</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, opacity: 0.8 }}>Cost/Unit</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Expiry</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Staff</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Stock</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, i) => {
                  const isLowStock = item.reorderAlert && item.minimumStockLevel && item.quantity < item.minimumStockLevel;
                  const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", ...(isExpired ? { background: 'rgba(220,38,38,0.08)' } : isLowStock ? { background: 'rgba(245,158,11,0.08)' } : {}) }}>
                      <td style={{ padding: "10px 12px", opacity: 0.5 }}>{startIndex + i + 1}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{item.itemName}</td>
                      <td style={{ padding: "10px 12px" }}>{item.category}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.quantity}</td>
                      <td style={{ padding: "10px 12px" }}>{item.unitType}</td>
                      <td style={{ padding: "10px 12px" }}>{item.usageArea || "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{item.supplierName || "-"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.costPerUnit ? `₹${parseFloat(item.costPerUnit).toFixed(2)}` : "-"}</td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {item.expiryDate ? (
                          <span style={{ color: isExpired ? '#dc2626' : '#333', fontSize: '0.8rem' }}>
                            {formatDate(item.expiryDate)}{isExpired && ' [EXP]'}
                          </span>
                        ) : "-"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.8rem" }}>{item.assignedStaff?.fullName || "-"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {isLowStock ? <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.8rem' }}>LOW</span> : <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>OK</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="btn btn-sm btn-edit" onClick={() => handleEdit(item)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Edit</button>
                          <button className="btn btn-sm btn-delete" onClick={() => handleDelete(item.id)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage} onRowsPerPageChange={(n) => { setRowsPerPage(n); setCurrentPage(1); }} totalRows={items.length} />
        </>
      )}

      <ConfirmModal isOpen={confirmModal.isOpen} onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Item" message="Delete this housekeeping item?" confirmText="Delete" confirmVariant="danger" />
    </div>
  );
};

export default HousekeepingInventoryPage;
