import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';
import instructorIncentiveService from '../services/instructorIncentiveService';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import { Navigate } from 'react-router-dom';
import { Check, Download, Plus, X, DollarSign, Users, Clock, CheckCircle } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { showNoExportDataToast } from '../lib/exportToast';
import { downloadCsvFile } from '../lib/csvExport';
import ExportDialog from '../components/shared/ExportDialog';
import { writeRowsToXlsx } from '../lib/xlsxExport';
import DatePicker from '../components/shared/DatePicker';

const MINIMUM_INCENTIVE_AMOUNT = 1400;
const PAYMENT_MODES = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cheque', label: 'Cheque' },
];
const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Rejected', label: 'Rejected' },
];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const AUTHORIZED_ROLES = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager'];

const InstructorIncentivesPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [incentives, setIncentives] = useState([]);
  const [summary, setSummary] = useState({ pending: { amount: 0, count: 0 }, approved: { amount: 0, count: 0 }, paid: { amount: 0, count: 0 }, rejected: { amount: 0, count: 0 } });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [instructors, setInstructors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [activeTab, setActiveTab] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, action: null });

  // Form data
  const [formData, setFormData] = useState({
    instructorId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'Cash',
    description: '',
    lessonCount: '',
    notes: '',
  });

  const isAdmin = useMemo(() => AUTHORIZED_ROLES.includes(user?.designation), [user?.designation]);

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadIncentives = useCallback(async () => {
    try {
      setLoading(true);
      setCurrentPage(1);
      const statusFilter = activeTab === 'All' ? '' : activeTab;
      const data = await instructorIncentiveService.getIncentives({
        month: selectedMonth,
        year: selectedYear,
        status: statusFilter,
      });
      setIncentives(data.data || []);
    } catch (error) {
      console.error('Error loading incentives:', error);
      showMessage(`Error loading incentives: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, activeTab]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await instructorIncentiveService.getSummary({
        month: selectedMonth,
        year: selectedYear,
      });
      setSummary(data.data || { pending: { amount: 0, count: 0 }, approved: { amount: 0, count: 0 }, paid: { amount: 0, count: 0 }, rejected: { amount: 0, count: 0 } });
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }, [selectedMonth, selectedYear]);

  const loadInstructors = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to load employees: ${response.status}`);
      const responseData = await response.json();
      const employeesData = Array.isArray(responseData) ? responseData : (responseData.data || []);
      const instructorList = employeesData.filter(emp => emp.designation === 'Instructor' && emp.isApproved !== false);
      setInstructors(instructorList);
    } catch (error) {
      console.error('Error loading instructors:', error);
      setInstructors([]);
    }
  }, []);

  useEffect(() => {
    loadIncentives();
    loadSummary();
    loadInstructors();
  }, [loadIncentives, loadSummary, loadInstructors]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      instructorId: '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      paymentMode: 'Cash',
      description: '',
      lessonCount: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.instructorId) {
      showMessage('Please select an instructor.', 'error');
      return;
    }
    if (!formData.date) {
      showMessage('Please select a date.', 'error');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) < MINIMUM_INCENTIVE_AMOUNT) {
      showMessage(`Amount must be at least Rs${MINIMUM_INCENTIVE_AMOUNT}. Only lessons with Rs${MINIMUM_INCENTIVE_AMOUNT}+ are eligible for incentives.`, 'error');
      return;
    }
    if (!formData.paymentMode) {
      showMessage('Please select payment mode.', 'error');
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await instructorIncentiveService.updateIncentive(editingId, formData);
        showMessage('Incentive updated successfully.');
      } else {
        await instructorIncentiveService.createIncentive(formData);
        showMessage('Incentive created successfully.');
      }
      resetForm();
      loadIncentives();
      loadSummary();
    } catch (error) {
      console.error('Error saving incentive:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (incentive) => {
    setFormData({
      instructorId: incentive.instructorId,
      date: incentive.date.split('T')[0],
      amount: String(incentive.amount),
      paymentMode: incentive.paymentMode,
      description: incentive.description || '',
      lessonCount: String(incentive.lessonCount || ''),
      notes: incentive.notes || '',
    });
    setEditingId(incentive.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setLoading(true);
      await instructorIncentiveService.updateIncentive(id, { status: newStatus });
      showMessage(`Incentive ${newStatus.toLowerCase()} successfully.`);
      loadIncentives();
      loadSummary();
    } catch (error) {
      console.error('Error updating status:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await instructorIncentiveService.deleteIncentive(id);
      showMessage('Incentive deleted successfully.');
      loadIncentives();
      loadSummary();
    } catch (error) {
      console.error('Error deleting incentive:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, id: null, action: null });
    }
  };

  // Filter incentives by status tab
  const filteredIncentives = useMemo(() => {
    if (activeTab === 'All') return incentives;
    return incentives.filter(i => i.status === activeTab);
  }, [incentives, activeTab]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredIncentives.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedIncentives = filteredIncentives.slice(startIndex, startIndex + rowsPerPage);

  // Export
  const getExportRows = () => filteredIncentives.map((i) => ({
    'Date': new Date(i.date).toLocaleDateString('en-IN'),
    'Instructor': i.instructor?.fullName || '-',
    'Amount': `Rs${i.amount}`,
    'Payment Mode': i.paymentMode,
    'Lessons': i.lessonCount || '-',
    'Status': i.status,
    'Description': i.description || '-',
    'Approved By': i.approvedBy?.fullName || '-',
    'Created By': i.createdBy?.fullName || '-',
  }));

  const handleDownloadCSV = () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast(); return; }
    downloadCsvFile(data, `InstructorIncentives_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`);
  };

  const handleDownloadExcel = async () => {
    const data = getExportRows();
    if (!data.length) { showNoExportDataToast(); return; }
    await writeRowsToXlsx(data, {
      sheetName: 'Instructor Incentives',
      fileName: `InstructorIncentives_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`,
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'bg-warning/15 text-warning border-warning/30';
      case 'Approved': return 'bg-primary/15 text-primary border-primary/30';
      case 'Paid': return 'bg-success/15 text-success border-success/30';
      case 'Rejected': return 'bg-destructive/15 text-destructive border-destructive/30';
      default: return 'bg-muted/15 text-muted-foreground border-border';
    }
  };

  // Access control
  if (!isAdmin && user?.designation !== 'Instructor') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="instructor-incentives-page space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Instructor <span className="text-primary">{t("Incentives")}</span></h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Track and manage instructor incentives (minimum Rs1400)')}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
          >
            {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Incentive</>}
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${messageType === 'error' ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {messageType === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {message}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-highest rounded-xl p-4 edge-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/15 flex items-center justify-center"><Clock className="w-5 h-5 text-warning" /></div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Pending</p>
              <p className="text-xl font-bold text-foreground">Rs {summary.pending.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{summary.pending.count} entries</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-4 edge-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Approved</p>
              <p className="text-xl font-bold text-foreground">Rs {summary.approved.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{summary.approved.count} entries</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-4 edge-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center"><DollarSign className="w-5 h-5 text-success" /></div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Paid</p>
              <p className="text-xl font-bold text-foreground">Rs {summary.paid.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{summary.paid.count} entries</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-highest rounded-xl p-4 edge-glow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/15 flex items-center justify-center"><Users className="w-5 h-5 text-destructive" /></div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Rejected</p>
              <p className="text-xl font-bold text-foreground">Rs {summary.rejected.amount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{summary.rejected.count} entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && isAdmin && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-background/80 px-4 pb-4 pt-[78px] sm:px-6 sm:pb-6 sm:pt-[92px]" onClick={() => resetForm()}>
          <div className="my-auto flex w-full max-w-2xl flex-col overflow-visible rounded-xl border border-border bg-surface-container-highest" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4 sm:px-5 sm:py-4">
              <h3 className="text-xl font-bold text-foreground">{editingId ? 'Edit Incentive' : 'Add Incentive'}</h3>
              <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-surface-container-high text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:px-5 sm:py-4">
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Instructor *</label>
                    <SearchableSelect
                      name="instructorId"
                      value={formData.instructorId}
                      onChange={handleFormChange}
                      options={instructors.map((i) => ({ value: i.id, label: i.fullName }))}
                      placeholder="Select instructor..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Date *</label>
                    <DatePicker value={formData.date} onChange={(val) => setFormData((prev) => ({ ...prev, date: val }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Amount (Rs) * <span className="text-warning">(min Rs{MINIMUM_INCENTIVE_AMOUNT})</span></label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleFormChange}
                      min={MINIMUM_INCENTIVE_AMOUNT}
                      step="0.01"
                      required
                      placeholder={`Minimum Rs${MINIMUM_INCENTIVE_AMOUNT}`}
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Payment Mode *</label>
                    <SearchableSelect
                      name="paymentMode"
                      value={formData.paymentMode}
                      onChange={handleFormChange}
                      options={PAYMENT_MODES}
                      placeholder="Select payment mode..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Number of Lessons</label>
                    <input
                      type="number"
                      name="lessonCount"
                      value={formData.lessonCount}
                      onChange={handleFormChange}
                      min="0"
                      placeholder="0"
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Description</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="Reason for incentive..."
                      maxLength={200}
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className="btn-save-primary">{loading ? 'Saving...' : editingId ? 'Update Incentive' : 'Create Incentive'}</button>
                  <button type="button" onClick={resetForm} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4 p-4 rounded-xl bg-surface-container-highest border border-border edge-glow">
        <div className="flex items-end gap-3 w-full sm:w-auto">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Month</label>
            <SearchableSelect
              value={selectedMonth.toString()}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              options={MONTH_NAMES.map((name, i) => ({ value: (i + 1).toString(), label: name }))}
              placeholder="Select month..."
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">Year</label>
            <SearchableSelect
              value={selectedYear.toString()}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              options={[2024, 2025, 2026, 2027].map((y) => ({ value: y.toString(), label: y.toString() }))}
              placeholder="Select year..."
              searchable={false}
            />
          </div>
        </div>
        {filteredIncentives.length > 0 && (
          <div className="md:ml-auto">
            <ExportDialog
              title="Export Incentives"
              options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
              trigger={
                <button className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container transition-colors flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export
                </button>
              }
            />
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {['All', 'Pending', 'Approved', 'Paid', 'Rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container-high text-muted-foreground hover:text-foreground border border-transparent hover:bg-surface-container-highest'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">{MONTH_NAMES[selectedMonth - 1]} {selectedYear} Incentives</h3>
        </div>

        {loading ? (
          <div className="p-6"><TableSkeleton rows={5} /></div>
        ) : filteredIncentives.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No incentives found for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.</p>
            {isAdmin && <p className="text-xs mt-1">Click "Add Incentive" to create one.</p>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-border">
                    {['DATE', 'INSTRUCTOR', 'AMOUNT', 'PAYMENT MODE', 'LESSONS', 'STATUS', 'DESCRIPTION', ''].map((h) => (
                      <th key={h || 'actions'} className="px-5 py-3 text-left text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedIncentives.map((incentive) => (
                    <tr key={incentive.id} className="border-b border-border/50 hover:bg-surface-container-high/50 transition-colors">
                      <td className="px-5 py-4 text-muted-foreground">{new Date(incentive.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                            {(incentive.instructor?.fullName || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{incentive.instructor?.fullName || '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-foreground mono-data">Rs{incentive.amount.toLocaleString()}</td>
                      <td className="px-5 py-4 text-muted-foreground">{incentive.paymentMode}</td>
                      <td className="px-5 py-4 text-muted-foreground mono-data">{incentive.lessonCount || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-medium border ${getStatusBadgeClass(incentive.status)}`}>
                          {incentive.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground max-w-[200px] truncate">{incentive.description || '-'}</td>
                      <td className="px-5 py-4">
                        {isAdmin && (
                          <div className="flex gap-1">
                            {incentive.status === 'Pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(incentive.id, 'Approved')}
                                  className="p-1.5 rounded hover:bg-success/10 text-success transition-colors"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleStatusChange(incentive.id, 'Rejected')}
                                  className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {incentive.status === 'Approved' && (
                              <button
                                onClick={() => handleStatusChange(incentive.id, 'Paid')}
                                className="p-1.5 rounded hover:bg-success/10 text-success transition-colors"
                                title="Mark as Paid"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            {incentive.status !== 'Paid' && (
                              <button
                                onClick={() => handleEdit(incentive)}
                                className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                                title="Edit"
                              >
                                <span className="text-xs">Edit</span>
                              </button>
                            )}
                            {incentive.status !== 'Paid' && (
                              <button
                                onClick={() => setConfirmModal({ isOpen: true, id: incentive.id, action: 'delete' })}
                                className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                                title="Delete"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-1 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
                total={filteredIncentives.length}
              />
            </div>
          </>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Incentive"
        message="Are you sure you want to delete this incentive? This action cannot be undone."
        onConfirm={() => handleDelete(confirmModal.id)}
        onCancel={() => setConfirmModal({ isOpen: false, id: null, action: null })}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default InstructorIncentivesPage;
