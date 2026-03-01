import React, { useState, useEffect } from "react";
import groceriesInventoryService from "../services/groceriesInventoryService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import "../styles/GroceriesInventoryPage.css";

const GroceriesInventoryPage = () => {
  const [groceries, setGroceries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "kg",
    price: "",
    description: "",
    employeeId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch groceries and employees
  useEffect(() => {
    fetchGroceries();
    fetchEmployees();
  }, []);

  const fetchGroceries = async () => {
    try {
      setLoading(true);
      const data = await groceriesInventoryService.getGroceries();
      setGroceries(data);
    } catch (err) {
      setError("Failed to fetch groceries");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      // API returns nested structure: { data: [...], pagination: {...} }
      const employeeList = response.data?.data || response.data || response || [];
      const finalList = Array.isArray(employeeList) ? employeeList : [];
      console.log("Fetched employees:", finalList); // Debug log
      setEmployees(finalList);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setEmployees([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmployeeSelect = (event) => {
    setFormData((prev) => ({
      ...prev,
      employeeId: event.target.value,
    }));
  };

  // Transform employees to SearchableSelect format
  const employeeOptions = Array.isArray(employees)
    ? employees.map((emp) => ({
        value: emp.id,
        label: `${emp.fullName} (${emp.designation})`,
      }))
    : [];

  console.log("Employee options:", employeeOptions); // Debug log

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (!formData.name || !formData.quantity || !formData.price) {
        setError("Please fill in all required fields");
        return;
      }

      if (editingId) {
        await groceriesInventoryService.updateGrocery(editingId, formData);
        setSuccess("Grocery updated successfully");
      } else {
        await groceriesInventoryService.createGrocery(formData);
        setSuccess("Grocery added successfully");
      }

      setFormData({
        name: "",
        quantity: "",
        unit: "kg",
        price: "",
        description: "",
        employeeId: "",
      });
      setEditingId(null);
      setShowForm(false);
      fetchGroceries();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save grocery");
      console.error(err);
    }
  };

  const handleEdit = (grocery) => {
    setFormData({
      name: grocery.name,
      quantity: grocery.quantity,
      unit: grocery.unit,
      price: grocery.price,
      description: grocery.description || "",
      employeeId: grocery.employeeId || "",
    });
    setEditingId(grocery.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this grocery?")) {
      try {
        await groceriesInventoryService.deleteGrocery(id);
        setSuccess("Grocery deleted successfully");
        fetchGroceries();
      } catch (err) {
        setError("Failed to delete grocery");
        console.error(err);
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      quantity: "",
      unit: "kg",
      price: "",
      description: "",
      employeeId: "",
    });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const calculateTotal = () => {
    return groceries.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const getEmployeeName = (employeeId) => {
    if (!Array.isArray(employees)) return "Unassigned";
    const employee = employees.find((e) => e.id === employeeId);
    return employee ? employee.fullName : "Unassigned";
  };

  return (
    <div className="groceries-inventory-container">
      <h1>Groceries Inventory</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="groceries-header">
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Close Form" : "Add New Grocery"}
        </button>
      </div>

      {showForm && (
        <form className="groceries-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Grocery Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Rice, Oil, Flour"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="Enter quantity"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Unit</label>
              <select name="unit" value={formData.unit} onChange={handleInputChange}>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="l">Liter (l)</option>
                <option value="ml">Milliliter (ml)</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="units">Units</option>
              </select>
            </div>

            <div className="form-group">
              <label>Price per Unit *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Enter price"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional notes"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Allocated To</label>
            <SearchableSelect
              name="employeeId"
              options={employeeOptions}
              value={formData.employeeId}
              onChange={handleEmployeeSelect}
              placeholder="Select employee (optional)"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-success">
              {editingId ? "Update Grocery" : "Add Grocery"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="groceries-summary">
        <div className="summary-card">
          <h3>Total Items</h3>
          <p className="summary-value">{groceries.length}</p>
        </div>
        <div className="summary-card">
          <h3>Total Value</h3>
          <p className="summary-value">₹{calculateTotal().toFixed(2)}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading groceries...</div>
      ) : groceries.length === 0 ? (
        <div className="empty-state">
          <p>No groceries found. Add one to get started!</p>
        </div>
      ) : (
        <div className="groceries-table-wrapper">
          <table className="groceries-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Price/Unit</th>
                <th>Total Price</th>
                <th>Allocated To</th>
                <th>Description</th>
                <th>Added Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groceries.map((grocery) => (
                <tr key={grocery.id}>
                  <td className="name-cell">{grocery.name}</td>
                  <td>{grocery.quantity}</td>
                  <td>{grocery.unit}</td>
                  <td>₹{grocery.price.toFixed(2)}</td>
                  <td className="total-price">₹{grocery.totalPrice.toFixed(2)}</td>
                  <td>{getEmployeeName(grocery.employeeId)}</td>
                  <td className="description-cell">{grocery.description || "-"}</td>
                  <td>{new Date(grocery.createdAt).toLocaleDateString()}</td>
                  <td className="action-cell">
                    <button
                      className="btn btn-sm btn-edit"
                      onClick={() => handleEdit(grocery)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-delete"
                      onClick={() => handleDelete(grocery.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GroceriesInventoryPage;
