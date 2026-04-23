import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Navigate } from "react-router-dom";
import { Download, Leaf, Package, Pencil, Plus, Search, Trash2, User, X } from "lucide-react";
import { TableSkeleton } from "../components/Skeleton";
import OperationalMetricCard from "../components/OperationalMetricCard";
import SearchableSelect from "../components/SearchableSelect";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/Pagination";
import ExportDialog from "../components/shared/ExportDialog";
import { downloadCsvFile } from "../lib/csvExport";
import { showNoExportDataToast } from "../lib/exportToast";
import { writeRowsToXlsx } from "../lib/xlsxExport";
import usePermissions from "../hooks/usePermissions";
import { useI18n } from "../context/I18nContext";
import grassBeddingService from "../services/grassBeddingService";
import { getEmployees } from "../services/employeeService";
import { getHorses } from "../services/horseService";

const ENTRY_TYPES = ["Grass", "Bedding"];

const getLocalDateTimeString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const createEmptyForm = () => ({
  horseId: "",
  entryType: "Grass",
  supplyName: "",
  collectedById: "",
  collectedAt: getLocalDateTimeString(),
  grassLoadReceived: "",
  weightInTons: "",
  notes: "",
});

const GrassBeddingPage = () => {
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
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  const [formData, setFormData] = useState(createEmptyForm);

  const showMsg = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await grassBeddingService.getItems({ search });
      setItems(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch {
      showMsg("Failed to load grass and bedding records", "error");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    const load = async () => {
      try {
        const horseResponse = await getHorses();
        setHorses(Array.isArray(horseResponse.data) ? horseResponse.data : horseResponse.data?.data || []);
      } catch {
        setHorses([]);
      }
      try {
        const employeeResponse = await getEmployees();
        const employeeList = employeeResponse.data?.data || employeeResponse.data || employeeResponse || [];
        setEmployees(Array.isArray(employeeList) ? employeeList : []);
      } catch {
        setEmployees([]);
      }
    };
    load();
  }, []);

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await grassBeddingService.updateItem(editingId, formData);
        showMsg("Record updated");
      } else {
        await grassBeddingService.createItem(formData);
        showMsg("Record added");
      }
      resetForm();
      fetchItems();
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to save record", "error");
    }
  };

  const handleEdit = (item) => {
    setFormData({
      horseId: item.horseId || "",
      entryType: item.entryType || "Grass",
      supplyName: item.supplyName || "",
      collectedById: item.collectedById || "",
      collectedAt: item.collectedAt ? new Date(item.collectedAt).toISOString().slice(0, 16) : getLocalDateTimeString(),
      grassLoadReceived:
        item.grassLoadReceived === true ? "Yes" : item.grassLoadReceived === false ? "No" : "",
      weightInTons: item.weightInTons != null ? String(item.weightInTons) : "",
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id) => setConfirmModal({ isOpen: true, id });

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      await grassBeddingService.deleteItem(id);
      showMsg("Deleted");
      fetchItems();
    } catch {
      showMsg("Failed to delete", "error");
    }
  };

  const getExportRows = () => items.map((item) => ({
    "Horse": item.horse?.name || "",
    "Stable #": item.horse?.stableNumber || "",
    "Type": item.entryType || "",
    "Name": item.supplyName || "",
    "Collected By": item.collectedBy?.fullName || "",
    "Timestamp": item.collectedAt ? new Date(item.collectedAt).toLocaleString("en-IN") : "",
    "Grass Load Received": item.grassLoadReceived === true ? "Yes" : item.grassLoadReceived === false ? "No" : "",
    "Weight In Tons": item.weightInTons ?? "",
    "Notes": item.notes || "",
  }));

  const handleDownloadExcel = async () => {
    const rows = getExportRows();
    if (rows.length === 0) { showNoExportDataToast("No data"); return; }
    await writeRowsToXlsx(rows, {
      sheetName: 'GrassBedding',
      fileName: `GrassBedding_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  };

  const handleDownloadCSV = () => {
    const rows = getExportRows();
    if (rows.length === 0) { showNoExportDataToast("No data"); return; }
    downloadCsvFile(rows, `GrassBedding_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!p.viewGrassAndBedding) return <Navigate to="/dashboard" replace />;

  const uniqueHorseCount = new Set(items.map((item) => item.horseId).filter(Boolean)).size;
  const uniqueCollectorCount = new Set(items.map((item) => item.collectedById).filter(Boolean)).size;
  const totalPages = Math.ceil(items.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = items.slice(startIndex, startIndex + rowsPerPage);

  return (
    <div className="grass-bedding-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Grass <span className="text-primary">&amp; Bedding</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Track grass and bedding collection, load receipt, and tonnage.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); if (editingId) resetForm(); }} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2">
          {showForm && !editingId ? <><X className="w-4 h-4" /> {t("Cancel")}</> : <><Plus className="w-4 h-4" /> {t("Add Entry")}</>}
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${messageType === "error" ? "bg-destructive/15 text-destructive border border-destructive/30" : "bg-success/15 text-success border border-success/30"}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <OperationalMetricCard label={t("TOTAL ENTRIES")} value={String(items.length).padStart(2, "0")} icon={Package} colorClass="text-primary" bgClass="bg-primary/10" sub={t("Recorded collection logs")} />
        <OperationalMetricCard label={t("HORSES COVERED")} value={String(uniqueHorseCount).padStart(2, "0")} icon={Leaf} colorClass="text-success" bgClass="bg-success/10" sub={t("Distinct horses logged")} />
        <OperationalMetricCard label={t("COLLECTORS")} value={String(uniqueCollectorCount).padStart(2, "0")} icon={User} colorClass="text-warning" bgClass="bg-warning/10" sub={t("Employees assigned")} />
      </div>

      {showForm && ReactDOM.createPortal(
        <div className="efm-page-modal-overlay fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-background/80 px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={resetForm}>
          <div className="my-auto flex w-full max-w-5xl flex-col overflow-visible rounded-2xl border border-border bg-surface-container-highest" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
              <h3 className="text-xl font-bold text-foreground">{editingId ? t("Edit Entry") : t("Add Entry")}</h3>
              <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:px-5 sm:py-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Horse")}</label>
                    <SearchableSelect name="horseId" value={formData.horseId} onChange={handleInputChange} options={[{ value: "", label: t("Select Horse") }, ...horses.map((horse) => ({ value: horse.id, label: `${horse.name}${horse.stableNumber ? ` (${horse.stableNumber})` : ""}` }))]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Type")}</label>
                    <SearchableSelect name="entryType" value={formData.entryType} onChange={handleInputChange} options={ENTRY_TYPES.map((type) => ({ value: type, label: type }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{formData.entryType === "Bedding" ? t("Bedding Name") : t("Grass Name")}</label>
                    <input type="text" name="supplyName" value={formData.supplyName} onChange={handleInputChange} maxLength={120} placeholder={formData.entryType === "Bedding" ? "e.g. Pine Shavings" : "e.g. Lucerne Grass"} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Collected By")}</label>
                    <SearchableSelect name="collectedById" value={formData.collectedById} onChange={handleInputChange} options={[{ value: "", label: t("Select Employee") }, ...employees.map((employee) => ({ value: employee.id, label: `${employee.fullName} (${employee.designation})` }))]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Timestamp")}</label>
                    <input type="datetime-local" name="collectedAt" value={formData.collectedAt} onChange={handleInputChange} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Grass Load Received")}</label>
                    <SearchableSelect name="grassLoadReceived" value={formData.grassLoadReceived} onChange={handleInputChange} searchable={false} options={[{ value: "", label: t("Select") }, { value: "Yes", label: "Yes" }, { value: "No", label: "No" }]} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Weight In Tons")}</label>
                    <input type="number" name="weightInTons" value={formData.weightInTons} onChange={handleInputChange} min="0" step="100" placeholder="100" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t("Notes")}</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" maxLength={1000} className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-save-primary">{editingId ? t("Save Changes") : t("Add Entry")}</button>
                  <button type="button" onClick={resetForm} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">{t("Cancel")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-border gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder={t("Search records...")} className="h-10 pl-10 pr-3 w-full rounded-lg bg-surface-container-high text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mono-data hidden sm:block">{items.length} entries</span>
            <ExportDialog
              title={t("Export Grass and Bedding")}
              options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
              trigger={(
                <button className="h-10 px-4 rounded-lg border border-border text-foreground hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2" type="button" aria-label={t("Export grass and bedding")} title={t("Export grass and bedding")}>
                  <Download className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">{t("Export")}</span>
                </button>
              )}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4"><TableSkeleton cols={7} rows={5} /></div>
        ) : items.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{search ? `No records matching "${search}"` : "No grass or bedding records found."}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                  {["HORSE", "TYPE", "NAME", "COLLECTED BY", "TIMESTAMP", "LOAD RECEIVED", "WEIGHT", "NOTES", ""].map((header) => (
                      <th key={header || "actions"} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground">{item.horse?.name || "-"}</span>
                          <span className="text-xs text-muted-foreground">{item.horse?.stableNumber || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{item.entryType}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{item.supplyName}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{item.collectedBy?.fullName || "-"}</td>
                      <td className="px-6 py-4 text-xs mono-data text-foreground">{item.collectedAt ? new Date(item.collectedAt).toLocaleString("en-IN") : "-"}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{item.grassLoadReceived === true ? "Yes" : item.grassLoadReceived === false ? "No" : "-"}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{item.weightInTons ?? "-"}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-[240px] truncate">{item.notes || "-"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary" title={t("Edit")}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title={t("Delete")}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
              onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
              total={items.length}
            />
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title={t("Delete Entry")}
        message={t("Delete this grass/bedding record?")}
        confirmText={t("Delete")}
        confirmVariant="danger"
      />
    </div>
  );
};

export default GrassBeddingPage;
