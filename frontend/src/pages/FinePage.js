import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';
import fineService from '../services/fineService';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import { Navigate } from 'react-router-dom';
import { Check, DollarSign, Download, Plus, Upload, X, Zap } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import * as XLSX from 'xlsx';

const STATUS_OPTIONS = ['Open', 'Resolved', 'Dismissed'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const AUTHORIZED_ROLES = ['Super Admin', 'Director', 'School Administrator', 'Stable Manager', 'Jamedar', 'Instructor', 'Ground Supervisor'];

const FinePage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const p = usePermissions();
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingFine, setViewingFine] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [resolvingFine, setResolvingFine] = useState(null);
  const [message, setMessage] = useState('');
  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    issuedToId: '',
    reason: '',
    amount: '',
    evidenceImage: null,
  });

  // Resolve form
  const [resolveData, setResolveData] = useState({
    status: 'Resolved',
    resolutionNotes: '',
  });

  // Define hierarchy relationships for sorting
  const getHierarchyInfo = (designation) => {
    const hierarchy = {
      'Super Admin': { superiors: [], subordinates: ['Director', 'School Administrator', 'Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'Director': { superiors: ['Super Admin'], subordinates: ['School Administrator', 'Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'School Administrator': { superiors: ['Director', 'Super Admin'], subordinates: ['Ground Supervisor', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Executive Admin', 'Executive Accounts'] },
      'Ground Supervisor': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Guard', 'Gardener', 'Housekeeping', 'Electrician'] },
      'Stable Manager': { superiors: ['Director', 'School Administrator', 'Super Admin', 'Ground Supervisor'], subordinates: ['Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar'] },
      'Senior Executive Admin': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Executive Admin'] },
      'Senior Executive Accounts': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Executive Accounts'] },
      'Guard': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Gardener': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Housekeeping': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Electrician': { superiors: ['Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Groom': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Riding Boy': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Rider': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Instructor': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Farrier': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Jamedar': { superiors: ['Stable Manager', 'Ground Supervisor', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Executive Admin': { superiors: ['Senior Executive Admin', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
      'Executive Accounts': { superiors: ['Senior Executive Accounts', 'School Administrator', 'Director', 'Super Admin'], subordinates: [] },
    };
    return hierarchy[designation] || { superiors: [], subordinates: [] };
  };

  // Define which roles each designation can see
  // Hierarchy: Supers see all, Middles see peers+superiors+subordinates, Staff see parents+superiors+peers
  const getVisibleRoles = (userDesignation) => {
    const roleVisibility = {
      'Super Admin': null,
      'Director': null,
      'School Administrator': null,
      'Ground Supervisor': ['Ground Supervisor', 'Director', 'School Administrator', 'Super Admin', 'Stable Manager', 'Senior Executive Admin', 'Senior Executive Accounts', 'Guard', 'Gardener', 'Housekeeping', 'Electrician'],
      'Stable Manager': ['Stable Manager', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Senior Executive Admin', 'Senior Executive Accounts', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar'],
      'Senior Executive Admin': ['Senior Executive Admin', 'Senior Executive Accounts', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Stable Manager', 'Executive Admin'],
      'Senior Executive Accounts': ['Senior Executive Accounts', 'Senior Executive Admin', 'Director', 'School Administrator', 'Super Admin', 'Ground Supervisor', 'Stable Manager', 'Executive Accounts'],
      'Jamedar': ['Jamedar', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Guard': ['Guard', 'Ground Supervisor', 'Gardener', 'Housekeeping', 'Electrician'],
      'Groom': ['Groom', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Riding Boy': ['Riding Boy', 'Groom', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Rider': ['Rider', 'Groom', 'Riding Boy', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Instructor': ['Instructor', 'Groom', 'Riding Boy', 'Rider', 'Farrier', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Farrier': ['Farrier', 'Groom', 'Riding Boy', 'Rider', 'Instructor', 'Jamedar', 'Stable Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Electrician': ['Electrician', 'Ground Supervisor', 'Guard', 'Gardener', 'Housekeeping'],
      'Gardener': ['Gardener', 'Ground Supervisor', 'Guard', 'Housekeeping', 'Electrician'],
      'Housekeeping': ['Housekeeping', 'Ground Supervisor', 'Guard', 'Gardener', 'Electrician'],
      'Executive Admin': ['Executive Admin', 'Senior Executive Admin', 'Director', 'School Administrator', 'Super Admin'],
      'Executive Accounts': ['Executive Accounts', 'Senior Executive Accounts', 'Director', 'School Administrator', 'Super Admin'],
    };
    return roleVisibility[userDesignation];
  };

  // Filter and sort employees based on user's role
  const getFilteredEmployeeList = (allEmployees) => {
    if (!user) return [];
    
    const visibleRoles = getVisibleRoles(user.designation);
    
    // Super Admin, Director, School Administrator see all
    if (visibleRoles !== null) {
      // Filter by visible roles
      allEmployees = allEmployees.filter(emp => visibleRoles.includes(emp.designation));
    }

    // Sort: pending first, then superiors, then self/peers, then subordinates
    const userHierarchy = getHierarchyInfo(user.designation);
    return allEmployees.sort((a, b) => {
      // 1. Pending employees first
      if (a.isApproved !== b.isApproved) {
        return a.isApproved ? 1 : -1; // Not approved comes first
      }

      // 2. Get sort priority for each employee
      const getPriority = (emp) => {
        if (userHierarchy.superiors.includes(emp.designation)) return 1; // Superiors
        if (emp.designation === user.designation) return 2; // Self/peers
        if (userHierarchy.subordinates.includes(emp.designation)) return 3; // Subordinates
        return 4; // Others
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 3. Within same priority, sort by name
      return a.fullName.localeCompare(b.fullName);
    });
  };

  // Check if user can issue fines
  const canIssueFines = useMemo(() => AUTHORIZED_ROLES.includes(user?.designation), [user?.designation]);

  const loadFines = useCallback(async () => {
    try {
      setLoading(true);
      setCurrentPage(1); // Reset pagination
      console.log('Loading fines with filters:', filters);
      const data = await fineService.getAllFines(filters);
      console.log('Fines data received:', data);
      setFines(data.fines || []);
    } catch (error) {
      console.error('✗ Error loading fines:', error);
      setMessage(`✗ Error loading fines: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadEmployees = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      console.log('Loading employees from:', `${apiUrl}/employees`);

      const response = await fetch(`${apiUrl}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load employees: ${response.status}`);
      }

      const responseData = await response.json();
      const employeesData = Array.isArray(responseData) ? responseData : (responseData.data || []);
      
      // Apply role-based filtering
      const filteredEmployees = getFilteredEmployeeList(employeesData);
      console.log('Parsed employees:', filteredEmployees);
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    loadFines();
    loadEmployees();
  }, [loadFines, loadEmployees]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        setFullScreenImage(null);
        setViewingFine(null);
        setResolvingFine(null);
      }
    };
    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'evidenceImage' && files.length > 0) {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE) {
        alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }
      setFormData((prev) => ({ ...prev, evidenceImage: file }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleResolveDataChange = (e) => {
    const { name, value } = e.target;
    setResolveData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.issuedToId) {
      setMessage('✗ Please select an employee');
      return;
    }
    if (!formData.reason.trim()) {
      setMessage('✗ Please enter a reason');
      return;
    }
    if (formData.reason.length > 500) {
      setMessage('✗ Reason cannot exceed 500 characters');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage('✗ Please enter a valid amount');
      return;
    }
    if (!formData.evidenceImage) {
      setMessage('✗ Please upload evidence image');
      return;
    }

    try {
      setLoading(true);
      setMessage('Processing...');
      console.log('Submitting fine form...');

      const data = await fineService.issueFine(formData);
      console.log('Fine created:', data);

      setMessage('✓ Fine issued successfully');
      setFormData({
        issuedToId: '',
        reason: '',
        amount: '',
        evidenceImage: null,
      });
      
      // Clear file input
      const fileInput = document.querySelector('input[name="evidenceImage"]');
      if (fileInput) fileInput.value = '';
      
      // Refresh the list
      loadFines();
    } catch (error) {
      console.error('❌ Error issuing fine:', error);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFine = async (e) => {
    e.preventDefault();

    if (!resolvingFine) return;

    try {
      setLoading(true);
      setMessage('Processing...');
      console.log('Resolving fine:', resolvingFine.id);

      const data = await fineService.updateFineStatus(
        resolvingFine.id,
        resolveData.status,
        resolveData.resolutionNotes
      );
      console.log('Fine updated:', data);

      setMessage('✓ Fine status updated successfully');
      setResolvingFine(null);
      setResolveData({
        status: 'Resolved',
        resolutionNotes: '',
      });

      // Refresh the list
      loadFines();
    } catch (error) {
      console.error('❌ Error updating fine:', error);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFine = (fineId) => {
    setConfirmModal({ isOpen: true, id: fineId });
  };

  const confirmDelete = async () => {
    const fineId = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });

    try {
      setLoading(true);
      console.log('Deleting fine:', fineId);
      await fineService.deleteFine(fineId);
      setMessage('✓ Fine deleted successfully');
      loadFines();
    } catch (error) {
      console.error('❌ Error deleting fine:', error);
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // Pagination logic
  const totalPages = Math.ceil(fines.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedFines = fines.slice(startIndex, endIndex);

  const handleDownloadExcel = () => {
    if (!fines.length) { alert('No data to download'); return; }
    const data = fines.map(f => ({
      'Date': f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-GB') : '',
      'Issued To': f.issuedTo?.fullName || '',
      'Amount (INR)': f.amount,
      'Reason': f.reason,
      'Status': f.status,
      'Resolved By': f.resolvedBy?.fullName || '',
      'Resolution Notes': f.resolutionNotes || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Fines');
    XLSX.writeFile(wb, `Fines_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (!p.viewFines) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mt-1 shrink-0">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">FINANCE / <span className="text-primary">FINE SYSTEM</span></p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{t('Internal Compliance')} <span className="text-primary">&amp;</span> {t('Fines')}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">{t('Manage facility-wide disciplinary actions and financial deductions.')}</p>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="bg-surface-container-highest rounded-lg p-4 edge-glow text-center min-w-[120px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MONTHLY VOLUME</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground mono-data mt-1">₹{fines.reduce((s, f) => s + parseFloat(f.amount || 0), 0).toLocaleString()}</p>
            <span className="text-xs text-primary">{fines.length} {t('records')}</span>
          </div>
          <div className="bg-surface-container-highest rounded-lg p-4 edge-glow text-center min-w-[100px]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PENDING</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground mono-data mt-1">{fines.filter(f => f.status === 'Open').length}</p>
            <span className="text-xs text-primary">ACTIONS</span>
          </div>
        </div>
      </div>

      {/* ── Message ── */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${/success|issued|resolved|updated/i.test(message) ? 'bg-success/15 text-success border border-success/30' : 'bg-destructive/15 text-destructive border border-destructive/30'}`}>
          {message}
        </div>
      )}

      {/* ── Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Issue Enforcement Form */}
        {canIssueFines && (
          <div className="lg:col-span-4 order-2 lg:order-1">
            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
              <div className="flex items-center gap-2 mb-5">
                <Plus className="w-5 h-5 text-success" />
                <h2 className="text-base font-bold text-foreground uppercase tracking-wider">{t('Issue Fine')}</h2>
              </div>
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">{t('Employee')}</label>
                  <SearchableSelect
                    name="issuedToId"
                    value={formData.issuedToId}
                    onChange={handleFormChange}
                    placeholder="Select Employee"
                    required
                    options={[
                      { value: '', label: 'Select Employee' },
                      ...employees.map(emp => ({ value: emp.id, label: `${emp.fullName} (${t(emp.designation)})` }))
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">{t('Reason')} (max 500)</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleFormChange}
                    placeholder="Describe the reason for issuing this fine..."
                    maxLength="500"
                    rows="3"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                  <span className="text-[10px] text-muted-foreground">{formData.reason.length}/500</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">{t('Fine Amount')} (INR)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleFormChange}
                    placeholder="₹0.00"
                    min="0"
                    step="0.01"
                    required
                    className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm mono-data placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">{t('Evidence Image')} *</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{t('Drop or click to upload')}</p>
                    <input
                      type="file"
                      name="evidenceImage"
                      onChange={handleFormChange}
                      accept="image/*"
                      required
                      className="w-full mt-2 text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/15 file:text-primary"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider flex items-center justify-center gap-2 transition-opacity active:opacity-80 hover:opacity-90 disabled:opacity-50">
                  {loading ? t('Processing...') : <>{t('Execute Fine Action')} <Zap className="w-4 h-4" /></>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Audit History Table */}
        <div className={canIssueFines ? 'lg:col-span-8 order-1 lg:order-2' : 'lg:col-span-12'}>
          <div className="bg-surface-container-highest rounded-lg edge-glow overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border gap-3">
              <h2 className="text-base font-bold text-foreground uppercase tracking-wider">{t('Audit History')}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <SearchableSelect
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  placeholder="All Status"
                  options={[
                    { value: '', label: 'All Status' },
                    ...STATUS_OPTIONS.map((status) => ({ value: status, label: status }))
                  ]}
                  className="w-full sm:w-36"
                />
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                />
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none"
                />
                <button
                  onClick={handleDownloadExcel}
                  className="h-10 px-3 rounded-lg border border-border text-xs text-muted-foreground flex items-center gap-1.5 hover:bg-surface-container-high transition-colors"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            </div>

            {/* Table */}
            {loading && <div className="p-4"><TableSkeleton cols={5} rows={5} /></div>}
            {!loading && fines.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">{t('No fines found')}</p>}

            {!loading && fines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Date')}</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Issued To')}</th>
                      <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Amount')}</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Reason')}</th>
                      <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Status')}</th>
                      <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFines.map((fine) => (
                      <tr key={fine.id} className="border-b border-border/30 hover:bg-surface-container-high/50 transition-colors">
                        <td className="px-5 py-4 mono-data text-xs text-muted-foreground whitespace-nowrap">{formatDate(fine.createdAt)}</td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                              {(fine.issuedTo?.fullName || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                            <span className="font-semibold text-foreground text-sm">{fine.issuedTo?.fullName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-right mono-data font-bold text-foreground">₹{parseFloat(fine.amount || 0).toFixed(2)}</td>
                        <td className="px-3 py-4 text-foreground max-w-[180px] truncate">{fine.reason?.substring(0, 50)}...</td>
                        <td className="px-3 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider ${
                            fine.status === 'Open' ? 'bg-warning/20 text-warning border border-warning/30' :
                            fine.status === 'Resolved' ? 'bg-success/20 text-success border border-success/30' :
                            'bg-muted text-muted-foreground border border-border'
                          }`}>
                            {t(fine.status === 'Open' ? 'PENDING' : fine.status?.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <button className="text-xs text-primary hover:underline font-medium" onClick={() => fine.evidenceImage && setFullScreenImage(fine.evidenceImage)}>
                              {t('Evidence')}
                            </button>
                            <button className="text-xs text-primary hover:underline font-medium" onClick={() => setViewingFine(fine)}>
                              {t('Details')}
                            </button>
                            {canIssueFines && fine.status === 'Open' && (
                              <button className="text-xs text-success hover:underline font-medium" onClick={() => { setResolvingFine(fine); setResolveData({ status: 'Resolved', resolutionNotes: '' }); }}>
                                {t('Resolve')}
                              </button>
                            )}
                            {canIssueFines && (fine.issuedById === user?.id || user?.designation === 'Director' || user?.designation === 'School Administrator') && (
                              <button className="text-xs text-destructive hover:underline font-medium" onClick={() => handleDeleteFine(fine.id)}>
                                {t('Delete')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="px-4 sm:px-5 py-3 border-t border-border">
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(newRows) => {
                  setRowsPerPage(newRows);
                  setCurrentPage(1);
                }}
                total={fines.length}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Image Viewer */}
      {fullScreenImage && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-foreground hover:bg-surface-container-high" onClick={() => setFullScreenImage(null)}>
            <X size={18} />
          </button>
          <img src={fullScreenImage} alt="Evidence" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>,
        document.body
      )}

      {/* Fine Details Modal */}
      {viewingFine && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setViewingFine(null)}>
          <div className="bg-surface-container-highest rounded-xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{t('Fine Details')}</h2>
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setViewingFine(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                ['Date Issued', formatDate(viewingFine.createdAt)],
                ['Issued By', viewingFine.issuedBy?.fullName],
                ['Issued To', viewingFine.issuedTo?.fullName],
                ['Amount', `₹${parseFloat(viewingFine.amount || 0).toFixed(2)}`],
                ['Reason', viewingFine.reason],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm text-foreground font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-sm text-muted-foreground">{t('Status')}</span>
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider ${
                  viewingFine.status === 'Open' ? 'bg-warning/20 text-warning border border-warning/30' :
                  viewingFine.status === 'Resolved' ? 'bg-success/20 text-success border border-success/30' :
                  'bg-muted text-muted-foreground border border-border'
                }`}>
                  {t(viewingFine.status === 'Open' ? 'PENDING' : viewingFine.status?.toUpperCase())}
                </span>
              </div>
              {viewingFine.resolvedBy && (
                <>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-muted-foreground">{t('Resolved By')}</span>
                    <span className="text-sm text-foreground font-medium">{viewingFine.resolvedBy?.fullName}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-muted-foreground">{t('Resolution Notes')}</span>
                    <span className="text-sm text-foreground font-medium text-right max-w-[60%]">{viewingFine.resolutionNotes}</span>
                  </div>
                </>
              )}
              {viewingFine.evidenceImage && (
                <div className="pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{t('Evidence')}</p>
                  <img
                    src={viewingFine.evidenceImage}
                    alt="Evidence"
                    className="max-w-full max-h-[200px] rounded-lg border border-border cursor-pointer object-cover"
                    onClick={() => setFullScreenImage(viewingFine.evidenceImage)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Resolve Fine Modal */}
      {resolvingFine && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setResolvingFine(null)}>
          <div className="bg-surface-container-highest rounded-xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{t('Resolve Fine')}</h2>
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" onClick={() => setResolvingFine(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResolveFine} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">{t('Status')}</label>
                <SearchableSelect
                  name="status"
                  value={resolveData.status}
                  onChange={handleResolveDataChange}
                  options={[
                    { value: 'Resolved', label: 'Resolved' },
                    { value: 'Dismissed', label: 'Dismissed' },
                  ]}
                  placeholder="Select status..."
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">{t('Resolution Notes')} ({t('optional')})</label>
                <textarea
                  name="resolutionNotes"
                  value={resolveData.resolutionNotes}
                  onChange={handleResolveDataChange}
                  placeholder="Add any notes about the resolution..."
                  maxLength="500"
                  rows="3"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none"
                />
                <span className="text-[10px] text-muted-foreground">{resolveData.resolutionNotes.length}/500</span>
              </div>
              <div className="flex gap-3">
                <button type="button" className="flex-1 h-10 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors" onClick={() => setResolvingFine(null)}>
                  {t('Cancel')}
                </button>
                <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50" disabled={loading}>
                  {loading ? t('Processing...') : <><Check size={16} /> {t('Update Status')}</>}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Fine"
        message="Are you sure you want to delete this fine?"
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default FinePage;
