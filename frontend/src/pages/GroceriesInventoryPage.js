import React, { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import groceriesInventoryService from "../services/groceriesInventoryService";
import { getEmployees } from "../services/employeeService";
import Pagination from "../components/Pagination";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const UNIT_OPTIONS = ["g","kg","ml","l","ltr","pcs","units","packets","packs","boxes","bottles","cans","jars","sachets","strips"];

const GroceriesInventoryPage = () => {
  const [groceries, setGroceries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "g",
    price: "",
    purchaseDate: new Date().toISOString().split("T")[0],
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

  useEffect(() => { fetchGroceries(); }, [fetchGroceries]);
  useEffect(() => { fetchEmployees(); }, []);

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
    setFormData({ name: "", quantity: "", unit: "g", price: "", purchaseDate: new Date().toISOString().split("T")[0], description: "", employeeId: "" });
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
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to save grocery", "error");
    }
  };

  const handleEdit = (g) => {
    const pd = g.purchaseDate ? new Date(g.purchaseDate).toISOString().split("T")[0]
               : new Date(g.createdAt).toISOString().split("T")[0];
    setFormData({
      name: g.name,
      quantity: g.quantity,
      unit: g.unit,
      price: g.price || "",
      purchaseDate: pd,
      description: g.description || "",
      employeeId: g.employeeId || "",
    });
    setEditingId(g.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this grocery entry?")) return;
    try {
      await groceriesInventoryService.deleteGrocery(id);
      showMsg("Deleted successfully");
      fetchGroceries();
    } catch { showMsg("Failed to delete", "error"); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  const handleDownloadExcel = () => {
    if (filteredGroceries.length === 0) { alert("No data to download"); return; }
    const data = filteredGroceries.map(g => ({
      "Date": formatDate(g.purchaseDate || g.createdAt),
      "Item Name": g.name,
      "Quantity": g.quantity,
      "Unit": g.unit,
      "Price/Unit (₹)": g.price || 0,
      "Total (₹)": g.totalPrice || 0,
      "Description": g.description || "",
      "Added By": g.createdBy?.fullName || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 12 },{ wch: 25 },{ wch: 10 },{ wch: 10 },{ wch: 15 },{ wch: 12 },{ wch: 25 },{ wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Groceries");
    XLSX.writeFile(wb, `GroceriesInventory_${MONTH_NAMES[selectedMonth-1]}_${selectedYear}.xlsx`);
  };

  const handleDownloadCSV = () => {
    if (filteredGroceries.length === 0) { alert("No data to download"); return; }
    const rows = filteredGroceries.map(g => ({
      "Date": formatDate(g.purchaseDate || g.createdAt),
      "Item Name": g.name,
      "Quantity": g.quantity,
      "Unit": g.unit,
      "Price/Unit": g.price || 0,
      "Total": g.totalPrice || 0,
      "Description": g.description || "",
      "Added By": g.createdBy?.fullName || "",
    }));
    const headers = Object.keys(rows[0]);
    const esc = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = "\uFEFF" + [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `GroceriesInventory_${MONTH_NAMES[selectedMonth-1]}_${selectedYear}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const years = [];
  for (let y = 2024; y <= new Date().getFullYear() + 1; y++) years.push(y);

  return (
    <div className="page-container" style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "1.5rem" }}>🛒 Groceries Inventory</h1>
        <p style={{ margin: 0, opacity: 0.7, fontSize: "0.875rem" }}>Track grocery items and purchases</p>
      </div>

      {message && (
        <div className={`alert alert-${messageType === "error" ? "error" : "success"}`} style={{ marginBottom: "16px" }}>
          {message}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Month</label>
          <select value={selectedMonth} onChange={e => { setSelectedMonth(parseInt(e.target.value)); setCurrentPage(1); }}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem" }}>
            {MONTH_NAMES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Year</label>
          <select value={selectedYear} onChange={e => { setSelectedYear(parseInt(e.target.value)); setCurrentPage(1); }}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", minWidth: "100px" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "200px" }}>
          <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Search</label>
          <input type="text" placeholder="Search by item name..." value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem" }} />
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginLeft: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", opacity: 0 }}>.</label>
            <button onClick={handleDownloadExcel} style={{ padding: "8px 16px", fontSize: "0.875rem", background: "#111", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 500 }}>Download Excel</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", opacity: 0 }}>.</label>
            <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }}
              style={{ padding: "8px 16px", fontSize: "0.875rem" }}>
              {showForm && !editingId ? "✕ Cancel" : "+ Add Item"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "12px 20px", minWidth: "130px" }}>
          <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Total Items</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{filteredGroceries.length}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "12px 20px", minWidth: "160px" }}>
          <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Total Value</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>₹{totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1rem" }}>{editingId ? "Edit Grocery Item" : "Add Grocery Item"}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Item Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange}
                  placeholder="e.g., Rice, Flour" required maxLength={100}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Quantity *</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                  placeholder="e.g., 500" step="0.01" min="0" required
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Unit</label>
                <select name="unit" value={formData.unit} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }}>
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
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
              <div>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Assigned To</label>
                <select name="employeeId" value={formData.employeeId} onChange={handleInputChange}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontSize: "0.875rem", boxSizing: "border-box" }}>
                  <option value="">-- None --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.designation})</option>)}
                </select>
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
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>Loading...</div>
      ) : filteredGroceries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          {search ? `No items matching "${search}"` : `No grocery entries for ${MONTH_NAMES[selectedMonth-1]} ${selectedYear}.`}
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
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
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Description</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Added By</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, opacity: 0.8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((g, i) => (
                  <tr key={g.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <td style={{ padding: "10px 12px", opacity: 0.5 }}>{startIndex + i + 1}</td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{formatDate(g.purchaseDate || g.createdAt)}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{g.name}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{g.quantity}</td>
                    <td style={{ padding: "10px 12px" }}>{g.unit}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{g.price > 0 ? `₹${g.price.toFixed(2)}` : "-"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{g.totalPrice > 0 ? `₹${g.totalPrice.toFixed(2)}` : "-"}</td>
                    <td style={{ padding: "10px 12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.description || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.8rem", opacity: 0.8 }}>{g.createdBy?.fullName || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="btn btn-sm btn-edit" onClick={() => handleEdit(g)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Edit</button>
                        <button className="btn btn-sm btn-delete" onClick={() => handleDelete(g.id)} style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
};

export default GroceriesInventoryPage;
