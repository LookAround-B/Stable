import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { TableSkeleton } from "../components/Skeleton";
import groceriesInventoryService from "../services/groceriesInventoryService";
import { getEmployees } from "../services/employeeService";
import SearchableSelect from "../components/SearchableSelect";
import ConfirmModal from "../components/ConfirmModal";
import { Navigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import usePermissions from "../hooks/usePermissions";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle,
  Clock,
  Download,
  IndianRupee,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  Users,
  X,
  Pencil,
  Trash2,
  BellRing
} from "lucide-react";
import Pagination from "../components/Pagination";
import DatePicker from '../components/shared/DatePicker';

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const UNIT_OPTIONS = [
  "g",
  "kg",
  "ml",
  "l",
  "ltr",
  "pcs",
  "units",
  "packets",
  "packs",
  "boxes",
  "bottles",
  "cans",
  "jars",
  "sachets",
  "strips",
];

const formatCurrency = (value) =>
  `INR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const daysUntil = (value) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatusMeta = (record) => {
  const diff = daysUntil(record.expiryDate);

  if (diff === null) {
    return {
      key: "OPTIMAL",
      label: "OPTIMAL",
      cls: "bg-success/15 text-success border border-success/20",
    };
  }

  if (diff < 0) {
    return {
      key: "EXPIRED",
      label: "EXPIRED",
      cls: "bg-destructive/15 text-destructive border border-destructive/20",
    };
  }

  if (diff <= 7) {
    return {
      key: "NEAR EXPIRY",
      label: "NEAR EXPIRY",
      cls: "bg-warning/15 text-warning border border-warning/20",
    };
  }

  if (diff <= 30) {
    return {
      key: "STOCKED",
      label: "STOCKED",
      cls: "bg-primary/15 text-primary border border-primary/20",
    };
  }

  return {
    key: "OPTIMAL",
    label: "OPTIMAL",
    cls: "bg-success/15 text-success border border-success/20",
  };
};

const GroceriesInventoryPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  const { user } = useAuth();
  const isAdmin = ["Super Admin", "Director", "School Administrator"].includes(
    user?.designation
  );

  const formCardRef = useRef(null);
  const ledgerCardRef = useRef(null);

  const [groceries, setGroceries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState("new");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [thresholdModal, setThresholdModal] = useState(null);
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

  const years = [];
  for (let y = 2024; y <= new Date().getFullYear() + 1; y += 1) years.push(y);

  const showMsg = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    window.clearTimeout(showMsg.timeoutId);
    showMsg.timeoutId = window.setTimeout(() => setMessage(""), 5000);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await getEmployees();
      const list = response.data?.data || response.data || response || [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch {
      setEmployees([]);
    }
  }, []);

  const fetchItemSuggestions = useCallback(async () => {
    try {
      const data = await groceriesInventoryService.getItemSuggestions();
      setItemSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setItemSuggestions([]);
    }
  }, []);

  useEffect(() => {
    fetchGroceries();
  }, [fetchGroceries]);

  useEffect(() => {
    fetchEmployees();
    fetchItemSuggestions();
  }, [fetchEmployees, fetchItemSuggestions]);

  const filteredGroceries = useMemo(
    () =>
      groceries.filter((record) => {
        const matchesSearch =
          !search ||
          record.name.toLowerCase().includes(search.toLowerCase()) ||
          (record.description || "").toLowerCase().includes(search.toLowerCase()) ||
          (record.employee?.fullName || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (record.createdBy?.fullName || "")
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesStatus =
          !filterStatus || getStatusMeta(record).key === filterStatus;

        return matchesSearch && matchesStatus;
      }),
    [groceries, search, filterStatus]
  );

  const totalPages = Math.ceil(filteredGroceries.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = filteredGroceries.slice(
    startIndex,
    startIndex + rowsPerPage
  );
  const totalValue = useMemo(
    () => groceries.reduce((sum, record) => sum + Number(record.totalPrice || 0), 0),
    [groceries]
  );

  const lowStockItems = useMemo(
    () =>
      groceries.filter(
        (record) =>
          record.threshold !== null &&
          record.threshold !== undefined &&
          Number(record.quantity) < Number(record.threshold)
      ),
    [groceries]
  );

  const nearExpiryCount = useMemo(
    () =>
      groceries.filter((record) => {
        const diff = daysUntil(record.expiryDate);
        return diff !== null && diff >= 0 && diff <= 7;
      }).length,
    [groceries]
  );

  const thresholdCoverage = useMemo(
    () =>
      groceries.filter(
        (record) => record.threshold !== null && record.threshold !== undefined
      ).length,
    [groceries]
  );

  const assignedCount = useMemo(
    () =>
      new Set(
        groceries
          .map((record) => record.employee?.id || record.employeeId)
          .filter(Boolean)
      ).size,
    [groceries]
  );

  const latestLogs = useMemo(
    () =>
      [...groceries]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.purchaseDate || 0).getTime() -
            new Date(a.createdAt || a.purchaseDate || 0).getTime()
        )
        .slice(0, 3),
    [groceries]
  );

  const signalsCopy = useMemo(() => {
    if (lowStockItems.length > 0) {
      return `${lowStockItems.length} inventory lines are below configured thresholds for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`;
    }
    if (nearExpiryCount > 0) {
      return `${nearExpiryCount} entries approach expiry within the next 7 days and should be reviewed.`;
    }
    return `Live grocery purchases for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} are stable with no critical inventory pressure.`;
  }, [lowStockItems.length, nearExpiryCount, selectedMonth, selectedYear]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      quantity: "",
      unit: "g",
      price: "",
      purchaseDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      description: "",
      employeeId: "",
    });
    setFormMode("new");
    setEditingId(null);
  }, []);

  const scrollToForm = () => {
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToLedger = () => {
    ledgerCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleStartNewPurchase = () => {
    resetForm();
    scrollToForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.quantity) {
      showMsg("Item name and quantity are required", "error");
      return;
    }

    try {
      if (editingId) {
        await groceriesInventoryService.updateGrocery(editingId, formData);
        showMsg("Inventory entry updated");
      } else {
        await groceriesInventoryService.createGrocery(formData);
        showMsg("Inventory entry added");
      }
      resetForm();
      fetchGroceries();
      fetchItemSuggestions();
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to save grocery", "error");
    }
  };

  const handleEdit = (record) => {
    setFormData({
      name: record.name,
      quantity: record.quantity,
      unit: record.unit,
      price: record.price || "",
      purchaseDate: record.purchaseDate
        ? new Date(record.purchaseDate).toISOString().split("T")[0]
        : new Date(record.createdAt).toISOString().split("T")[0],
      expiryDate: record.expiryDate
        ? new Date(record.expiryDate).toISOString().split("T")[0]
        : "",
      description: record.description || "",
      employeeId: record.employeeId || "",
    });
    setEditingId(record.id);
    setFormMode("new");
    scrollToForm();
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      await groceriesInventoryService.deleteGrocery(id);
      showMsg("Inventory entry deleted");
      fetchGroceries();
    } catch {
      showMsg("Failed to delete entry", "error");
    }
  };

  const handleSaveThreshold = async () => {
    if (!thresholdModal) return;
    try {
      await groceriesInventoryService.setThreshold(
        thresholdModal.record.id,
        thresholdModal.value === "" ? null : parseFloat(thresholdModal.value),
        thresholdModal.notifyAdmin
      );
      showMsg("Threshold updated");
      setThresholdModal(null);
      fetchGroceries();
    } catch {
      showMsg("Failed to update threshold", "error");
    }
  };

  const handleDownloadExcel = () => {
    if (filteredGroceries.length === 0) {
      showMsg("No data to export", "error");
      return;
    }

    const data = filteredGroceries.map((record) => ({
      Date: formatDate(record.purchaseDate || record.createdAt),
      "Item Name": record.name,
      Quantity: record.quantity,
      Unit: record.unit,
      "Price / Unit": record.price || 0,
      Total: record.totalPrice || 0,
      Expiry: record.expiryDate ? formatDate(record.expiryDate) : "",
      Description: record.description || "",
      "Assigned To": record.employee?.fullName || "",
      "Added By": record.createdBy?.fullName || "",
      Status: getStatusMeta(record).label,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Groceries");
    XLSX.writeFile(
      workbook,
      `GroceriesInventory_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.xlsx`
    );
  };

  if (!p.viewGroceriesInventory) return <Navigate to="/dashboard" replace />;

  return (
    <div className="groceries-page space-y-6">
      <div className="groceries-page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="lovable-header-kicker mb-2">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>SUPPLY CHAIN INTELLIGENCE</span>
          </div>
          <h1 className="display-sm text-foreground">Groceries Inventory</h1>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium flex items-center gap-2 hover:bg-surface-container-high transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            type="button"
            onClick={handleStartNewPurchase}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-white text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Purchase
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            messageType === "error"
              ? "bg-destructive/15 text-destructive border border-destructive/30"
              : "bg-success/15 text-success border border-success/30"
          }`}
        >
          {message}
        </div>
      )}

      <div className="groceries-kpi-grid grid grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="label-sm text-muted-foreground">TOTAL SKU ITEMS</span>
            <Package className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="display-sm text-foreground mono-data">{filteredGroceries.length.toLocaleString()}</p>
          <p className="text-xs text-success mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Live filtered inventory count
          </p>
        </div>

        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="label-sm text-muted-foreground">INVENTORY VALUE</span>
            <IndianRupee className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="display-sm text-foreground mono-data">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-primary mt-2 flex items-center gap-1">
            <Download className="w-3 h-3" />
            Current value of visible records
          </p>
        </div>

        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="label-sm text-muted-foreground">LOW STOCK ALERTS</span>
            <AlertTriangle className="w-5 h-5 text-warning/60" />
          </div>
          <p className="display-sm text-warning mono-data">{lowStockItems.length}</p>
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Threshold breaches in tracked items
          </p>
        </div>

        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <div className="flex items-center justify-between mb-3">
            <span className="label-sm text-muted-foreground">NEAR EXPIRY (7D)</span>
            <Clock className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="display-sm text-foreground mono-data">{nearExpiryCount}</p>
          <p className="text-xs text-destructive mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Entries needing expiry review
          </p>
        </div>
      </div>

      <div className="groceries-main-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
          <div ref={formCardRef} className="bg-surface-container-highest rounded-lg p-5 edge-glow">
            <div className="flex items-center gap-2 mb-5">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="heading-md text-foreground">STOCK REGISTRATION</h2>
            </div>

            {!editingId && (
              <div className="mb-5">
                <p className="label-sm text-muted-foreground mb-2">ENTRY MODE</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("select");
                      setFormData((prev) => ({
                        ...prev,
                        name: "",
                        quantity: "",
                        unit: "g",
                      }));
                    }}
                    className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors border ${
                      formMode === "select"
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-border bg-surface-container-high text-muted-foreground"
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode("new")}
                    className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors border ${
                      formMode === "new"
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-border bg-surface-container-high text-muted-foreground"
                    }`}
                  >
                    New Item
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {formMode === "select" && !editingId && itemSuggestions.length > 0 && (
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">ITEM DESIGNATION</label>
                  <SearchableSelect
                    value={formData.name}
                    onChange={(e) => {
                      const match = itemSuggestions.find((item) => item.name === e.target.value);
                      if (match) {
                        setFormData((prev) => ({
                          ...prev,
                          name: match.name,
                          unit: match.unit,
                          quantity: "",
                          price: "",
                        }));
                      }
                    }}
                    options={[
                      { value: "", label: "-- Choose an item --" },
                      ...itemSuggestions.map((item) => ({
                        value: item.name,
                        label: `${item.name} (${item.unit})`,
                      })),
                    ]}
                    placeholder="Search and select item..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Unit will be pre-filled from previous entries.
                  </p>
                </div>
              )}

              {(formMode === "new" || editingId) && (
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">ITEM DESIGNATION</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Premium Basmati Rice"
                    required
                    maxLength={100}
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">QUANTITY</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm mono-data placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">UNIT</label>
                  <SearchableSelect
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    options={UNIT_OPTIONS.map((unit) => ({ value: unit, label: unit }))}
                    placeholder="Select unit..."
                  />
                </div>
              </div>

              <div>
                <label className="label-sm text-muted-foreground block mb-1.5">UNIT PRICE (INR)</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm mono-data placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">PURCHASE DATE</label>
                  <DatePicker
                    value={formData.purchaseDate}
                    onChange={(val) => handleInputChange({ target: { name: 'purchaseDate', value: val } })}
                  />
                </div>
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">EXPIRY DATE</label>
                  <DatePicker
                    value={formData.expiryDate}
                    onChange={(val) => handleInputChange({ target: { name: 'expiryDate', value: val } })}
                  />
                </div>
              </div>

              <div>
                <label className="label-sm text-muted-foreground block mb-1.5">ASSIGNED TO</label>
                <SearchableSelect
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  options={[
                    { value: "", label: "-- None --" },
                    ...employees.map((employee) => ({
                      value: employee.id,
                      label: `${employee.fullName} (${t(employee.designation)})`,
                    })),
                  ]}
                  placeholder="Select employee..."
                />
              </div>

              <div>
                <label className="label-sm text-muted-foreground block mb-1.5">NOTES</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional notes"
                  rows="2"
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-white text-sm font-semibold tracking-wider uppercase"
                >
                  {editingId ? "Update Entry" : "Commit To Inventory"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-surface-container-highest rounded-lg overflow-hidden edge-glow">
            <div className="h-32 bg-gradient-to-br from-primary/20 to-primary-container relative">
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest/90 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="label-sm text-primary">INVENTORY STATUS</p>
                <h3 className="heading-md text-foreground">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded bg-success/20 text-success text-[10px] font-medium flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {assignedCount} assignees
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-medium flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {thresholdCoverage} thresholds armed
                  </span>
                  <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-[10px] font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {lowStockItems.length} alerts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 order-1 lg:order-2" ref={ledgerCardRef}>
          <div className="groceries-ledger-card bg-surface-container-highest rounded-lg edge-glow overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h2 className="heading-md text-foreground uppercase tracking-wider truncate">
                  Current Inventory Clusters
                </h2>
                <span className="text-xs text-muted-foreground mono-data shrink-0">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search items..."
                    className="h-8 pl-8 pr-8 w-44 rounded-lg bg-surface-container-high text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className={`p-2 rounded-lg transition-colors ${
                    showFilters || filterStatus
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-surface-container-high text-muted-foreground"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="px-5 py-3 border-b border-border bg-surface-container-high/40">
                <div className="flex flex-wrap gap-3 items-end">
                  <SearchableSelect
                    value={selectedMonth.toString()}
                    onChange={(e) => {
                      setSelectedMonth(parseInt(e.target.value, 10));
                      setCurrentPage(1);
                    }}
                    options={MONTH_NAMES.map((month, index) => ({
                      value: (index + 1).toString(),
                      label: month,
                    }))}
                    placeholder="Month"
                    className="w-40"
                  />
                  <SearchableSelect
                    value={selectedYear.toString()}
                    onChange={(e) => {
                      setSelectedYear(parseInt(e.target.value, 10));
                      setCurrentPage(1);
                    }}
                    options={years.map((year) => ({
                      value: year.toString(),
                      label: year.toString(),
                    }))}
                    placeholder="Year"
                    className="w-28"
                  />
                  <SearchableSelect
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: "", label: "All Statuses" },
                      { value: "OPTIMAL", label: "OPTIMAL" },
                      { value: "STOCKED", label: "STOCKED" },
                      { value: "NEAR EXPIRY", label: "NEAR EXPIRY" },
                      { value: "EXPIRED", label: "EXPIRED" },
                    ]}
                    placeholder="Status"
                    className="w-44"
                  />
                  {(filterStatus || search) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus("");
                        setSearch("");
                        setCurrentPage(1);
                      }}
                      className="h-9 px-3 rounded-lg text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-5">
                <TableSkeleton cols={7} rows={5} />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-5 py-3 text-left label-sm text-muted-foreground">ITEM NAME</th>
                        <th className="px-3 py-3 text-center label-sm text-muted-foreground">QTY</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">UNIT</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">PRICE</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">PURCHASE</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">EXPIRY</th>
                        <th className="px-3 py-3 text-right label-sm text-muted-foreground">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((record) => {
                        const status = getStatusMeta(record);
                        const isBelowThreshold =
                          record.threshold !== null &&
                          record.threshold !== undefined &&
                          Number(record.quantity) < Number(record.threshold);

                        return (
                          <tr
                            key={record.id}
                            className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                                  {(record.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-foreground block">{record.name}</span>
                                    {isBelowThreshold && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-destructive/15 text-destructive border border-destructive/20">
                                        LOW STOCK
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground tracking-wider">
                                    {record.employee?.fullName
                                      ? `ASSIGNED TO ${record.employee.fullName.toUpperCase()}`
                                      : record.createdBy?.fullName
                                      ? `LOGGED BY ${record.createdBy.fullName.toUpperCase()}`
                                      : "INVENTORY ENTRY"}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <button
                                      type="button"
                                      className="p-1 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                      onClick={() => handleEdit(record)}
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                      onClick={() => handleDelete(record.id)}
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        className="p-1 rounded text-muted-foreground hover:bg-surface-container-high hover:text-foreground transition-colors"
                                        onClick={() =>
                                          setThresholdModal({
                                            record,
                                            value: record.threshold ?? "",
                                            notifyAdmin: record.notifyAdmin ?? false,
                                          })
                                        }
                                        title="Configure Alert"
                                      >
                                        <BellRing className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center mono-data text-foreground font-semibold">
                              {Number(record.quantity).toFixed(1)}
                            </td>
                            <td className="px-3 py-4 text-muted-foreground">{record.unit}</td>
                            <td className="px-3 py-4 mono-data font-semibold text-foreground">
                              {record.price ? formatCurrency(record.price) : "-"}
                            </td>
                            <td className="px-3 py-4 mono-data text-xs text-muted-foreground">
                              {formatDate(record.purchaseDate || record.createdAt)}
                            </td>
                            <td className="px-3 py-4 mono-data text-xs text-muted-foreground">
                              {record.expiryDate ? formatDate(record.expiryDate) : "-"}
                            </td>
                            <td className="px-3 py-4 text-right">
                              <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold tracking-wider ${status.cls}`}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {paginatedItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                            No inventory lines match the current search and filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-2 border-t border-border">
                  <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(newRows) => {
                      setRowsPerPage(newRows);
                      setCurrentPage(1);
                    }}
                    total={filteredGroceries.length}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="heading-md text-foreground uppercase tracking-wider text-sm">
                  Log Stream
                </h3>
              </div>

              <div className="space-y-3">
                {latestLogs.length > 0 ? (
                  latestLogs.map((record) => {
                    const status = getStatusMeta(record);
                    return (
                      <div key={record.id} className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 ${
                            status.key === "EXPIRED"
                              ? "bg-destructive"
                              : status.key === "NEAR EXPIRY"
                              ? "bg-warning"
                              : "bg-primary"
                          }`}
                        />
                        <div>
                          <p className="text-sm text-foreground font-medium">
                            Inventory logged: {record.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(record.purchaseDate || record.createdAt)} • {record.createdBy?.fullName || user?.fullName || "System"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No grocery entries available for this cycle yet.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="heading-md text-foreground">Inventory Signals</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-[260px]">
                {signalsCopy}
              </p>
              <button
                type="button"
                onClick={scrollToLedger}
                className="label-sm text-primary mt-4 hover:underline"
              >
                OPEN LEDGER
              </button>
            </div>
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-container-highest rounded-xl p-6 w-[340px] edge-glow border border-border">
            <h3 className="text-lg font-bold text-foreground mb-1">Set Threshold Alert</h3>
            <p className="text-xs text-muted-foreground mb-4">{thresholdModal.record.name}</p>
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
              Threshold quantity ({thresholdModal.record.unit})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave empty to disable"
              value={thresholdModal.value}
              onChange={(e) =>
                setThresholdModal((prev) => ({
                  ...prev,
                  value: e.target.value,
                }))
              }
              className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none mb-3"
            />
            <label className="flex items-center gap-2 text-sm text-foreground mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={thresholdModal.notifyAdmin}
                onChange={(e) =>
                  setThresholdModal((prev) => ({
                    ...prev,
                    notifyAdmin: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded"
              />
              Notify admin when below threshold
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setThresholdModal(null)}
                className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveThreshold}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroceriesInventoryPage;


