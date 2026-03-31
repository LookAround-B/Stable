import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import expenseService from '../services/expenseService';
import { TableSkeleton } from '../components/Skeleton';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import { CheckCircle, Filter, Plus, TrendingUp, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import DatePicker from '../components/shared/DatePicker';
import { showNoExportDataToast } from '../lib/exportToast';
import ExportDialog from '../components/shared/ExportDialog';

const ExpensePage = () => {
  const { user } = useAuth();
  const p = usePermissions();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [message, setMessage] = useState('');
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [viewMode, setViewMode] = useState('Facility');

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    horseId: '',
    employeeId: '',
    startDate: '',
    endDate: '',
  });

  // Form data
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    horseId: '',
    employeeId: '',
    attachments: [],
  });

  const EXPENSE_TYPES = ['Medicine', 'Treatment', 'Maintenance', 'Miscellaneous'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

  const isAccountsUser = useMemo(() => ['Senior Executive Accounts', 'Executive Accounts', 'Super Admin', 'Director', 'School Administrator'].includes(user?.designation), [user?.designation]);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setCurrentPage(1); // Reset pagination
      console.log('Loading expenses with filters:', filters);
      const data = await expenseService.getAllExpenses(filters);
      console.log('Expenses data received:', data);
      if (data.expenses && data.expenses.length > 0) {
        console.log('Sample expense with horse data:', {
          id: data.expenses[0].id,
          horseId: data.expenses[0].horseId,
          horse: data.expenses[0].horse,
          employeeId: data.expenses[0].employeeId,
          employee: data.expenses[0].employee,
        });
      }
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setMessage(`Error loading expenses: ${error.error || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadHorses = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      console.log('Loading horses from:', `${apiUrl}/horses`);
      
      const response = await fetch(`${apiUrl}/horses`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Horses response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to load horses:', errorData);
        throw new Error(`Failed to load horses: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Horses response data:', responseData);
      
      // Handle both formats: { data: [] } and direct array
      const horsesData = Array.isArray(responseData) 
        ? responseData 
        : (responseData.data || []);
      
      console.log('Parsed horses:', horsesData);
      setHorses(horsesData);
    } catch (error) {
      console.error('Error loading horses:', error);
      setHorses([]);
    }
  }, []);

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
      
      console.log('Employees response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to load employees:', errorData);
        throw new Error(`Failed to load employees: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Employees response data:', responseData);
      
      // Handle both formats: { data: [] } and direct array
      const employeesData = Array.isArray(responseData) 
        ? responseData 
        : (responseData.data || []);
      
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
    loadExpenses();
    if (isAccountsUser) {
      loadHorses();
      loadEmployees();
    }
  }, [loadExpenses, isAccountsUser, loadHorses, loadEmployees]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    console.log(`Form field changed: ${name} = ${value}`);
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      console.log('Updated formData:', updated);
      return updated;
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];

    files.forEach((file) => {
      if (file.size <= MAX_FILE_SIZE) {
        validFiles.push(file);
      } else {
        setMessage(`File ${file.name} exceeds 5MB limit.`);
      }
    });

    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles],
    }));
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      if (!formData.type || !formData.amount || !formData.description || !formData.date) {
        throw new Error('Please fill in all required fields');
      }

      if (!formData.horseId && !formData.employeeId) {
        throw new Error('Please select either a horse or employee');
      }

      const submitData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        horseId: formData.horseId || null,
        employeeId: formData.employeeId || null,
        attachments: formData.attachments,
      };

      console.log('Submitting expense with formData:', formData);
      console.log('Final submitData:', submitData);

      if (editingExpense) {
        const updatedExpense = await expenseService.updateExpense(editingExpense.id, submitData);
        console.log('Expense updated:', updatedExpense);
        console.log('Returned horseId:', updatedExpense.horseId);
        console.log('Returned employeeId:', updatedExpense.employeeId);
        setMessage('Expense updated successfully.');
      } else {
        const createdExpense = await expenseService.createExpense(submitData);
        console.log('Expense created:', createdExpense);
        console.log('Returned horseId:', createdExpense.horseId);
        console.log('Returned horseId:', createdExpense.horseId);
        console.log('Returned employeeId:', createdExpense.employeeId);
      }

      resetForm();
      await loadExpenses();
      setMessage('Expense saved successfully.');

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error: ${error.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense) => {
    console.log('EDIT EXPENSE DATA:', expense);
    console.log('   horseId:', expense.horseId);
    console.log('   horse:', expense.horse);
    console.log('   employeeId:', expense.employeeId);
    console.log('   employee:', expense.employee);
    console.log('   attachments (raw):', expense.attachments);
    
    let parsedAttachments = [];
    if (expense.attachments) {
      try {
        parsedAttachments = typeof expense.attachments === 'string' ? JSON.parse(expense.attachments) : expense.attachments;
      } catch (e) {
        parsedAttachments = [];
      }
    }
    console.log('   attachments (parsed):', parsedAttachments);
    
    setEditingExpense(expense);
    setFormData({
      type: expense.type,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date.split('T')[0],
      horseId: expense.horseId || '',
      employeeId: expense.employeeId || '',
      attachments: parsedAttachments,
    });
  };

  const handleDownloadExcel = () => {
    if (expenses.length === 0) {
      showNoExportDataToast('No expenses to download');
      return;
    }

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount) => {
      return `\u20B9 ${parseFloat(amount || 0).toFixed(2)}`;
    };

    // Prepare data for Excel
    const excelData = expenses.map((expense) => ({
      'Date': formatDate(expense.date),
      'Type': expense.type || '',
      'Description': expense.description || '',
      'Amount': formatCurrency(expense.amount),
      'Assigned Horse': expense.horse?.name || '-',
      'Assigned Employee': expense.employee?.fullName || '-',
      'Created By': expense.createdBy?.fullName || '',
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Date
      { wch: 15 }, // Type
      { wch: 25 }, // Description
      { wch: 12 }, // Amount
      { wch: 18 }, // Assigned Horse
      { wch: 18 }, // Assigned Employee
      { wch: 15 }, // Created By
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

    // Generate filename with date
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `Expenses_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
    console.log('Downloaded expenses to:', filename);
  };

  // eslint-disable-next-line no-unused-vars
  const handleDownloadCSV = () => {
    if (expenses.length === 0) {
      showNoExportDataToast('No expenses to download');
      return;
    }

    const formatDate = (dateString) => {
      if (!dateString) return '';
      return new Date(dateString).toLocaleDateString('en-GB');
    };

    const csvData = expenses.map((expense) => ({
      'Date': formatDate(expense.date),
      'Type': expense.type || '',
      'Description': expense.description || '',
      'Amount': parseFloat(expense.amount || 0).toFixed(2),
      'Assigned Horse': expense.horse?.name || '-',
      'Assigned Employee': expense.employee?.fullName || '-',
      'Created By': expense.createdBy?.fullName || '',
    }));

    const headers = Object.keys(csvData[0]);
    const escape = (val) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [headers.map(escape).join(','), ...csvData.map(row => headers.map(h => escape(row[h])).join(','))];
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.id;
    setConfirmModal({ isOpen: false, id: null });
    try {
      setLoading(true);
      await expenseService.deleteExpense(id);
      setMessage('Expense deleted successfully.');
      await loadExpenses();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Error deleting expense: ${error.error}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: '',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      horseId: '',
      employeeId: '',
      attachments: [],
    });
    setEditingExpense(null);
  };

  const formatCurrency = (amount) => `\u20B9${amount.toFixed(2)}`;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

  const categoryMeta = {
    Medicine: { label: 'MEDICINE', cls: 'bg-destructive/15 text-destructive border border-destructive/20' },
    Treatment: { label: 'TREATMENT', cls: 'bg-warning/15 text-warning border border-warning/20' },
    Maintenance: { label: 'MAINTENANCE', cls: 'bg-primary/15 text-primary border border-primary/20' },
    Miscellaneous: { label: 'MISC', cls: 'bg-success/15 text-success border border-success/20' },
  };

  const visibleExpenses = useMemo(() => {
    if (viewMode === 'Asset') {
      return expenses.filter((expense) => expense.horseId || expense.horse);
    }
    return expenses;
  }, [expenses, viewMode]);

  const totalSpend = useMemo(
    () => visibleExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0),
    [visibleExpenses]
  );

  const averageSpend = useMemo(
    () => (visibleExpenses.length ? totalSpend / visibleExpenses.length : 0),
    [visibleExpenses, totalSpend]
  );

  const topCategory = useMemo(() => {
    const totals = visibleExpenses.reduce((acc, expense) => {
      acc[expense.type] = (acc[expense.type] || 0) + parseFloat(expense.amount || 0);
      return acc;
    }, {});
    const entry = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    return entry ? entry[0] : 'No Data';
  }, [visibleExpenses]);

  const latestTransactions = useMemo(
    () => visibleExpenses.slice(0, 4),
    [visibleExpenses]
  );

  const clearFilters = () => {
    setFilters({
      type: '',
      horseId: '',
      employeeId: '',
      startDate: '',
      endDate: '',
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(visibleExpenses.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedExpenses = visibleExpenses.slice(startIndex, endIndex);

  if (!p.viewExpenses) return <Navigate to="/dashboard" replace />;

  return (
    <div className="expense-page space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="lovable-header-kicker mb-2">
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--lg" />
            <span className="lovable-header-kicker-bar lovable-header-kicker-bar--sm" />
            <span>FINANCIAL INTELLIGENCE DASHBOARD</span>
          </div>
          <h1 className="display-sm text-foreground mt-1">Expense Tracking</h1>
        </div>
        {isAccountsUser && (
          <div className="flex flex-wrap gap-2 shrink-0 self-end sm:self-auto">
            <div className="flex rounded-lg overflow-hidden border border-border">
              {['Facility', 'Asset'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setViewMode(mode);
                    setCurrentPage(1);
                  }}
                  className={`px-3 sm:px-4 h-9 text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode === 'Facility' ? 'FACILITY' : 'ASSET'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingExpense(null);
              }}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Expense
            </button>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            /success|saved|updated|deleted/i.test(message)
              ? 'bg-success/15 text-success border border-success/30'
              : 'bg-destructive/15 text-destructive border border-destructive/30'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <span className="label-sm text-muted-foreground">MONTHLY TOTAL SPEND</span>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-2xl font-bold text-foreground mono-data">{formatCurrency(totalSpend)}</p>
            <span className="text-xs text-primary font-medium mb-1">{visibleExpenses.length} entries</span>
          </div>
          <div className="w-full h-1 bg-primary/20 rounded-full mt-3">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, visibleExpenses.length * 8 || 12)}%` }} />
          </div>
        </div>
        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <span className="label-sm text-muted-foreground">PRIMARY COST CENTER</span>
          <p className="text-lg font-bold text-foreground mt-2">{topCategory === 'No Data' ? 'NO ACTIVE DATA' : topCategory.toUpperCase()}</p>
          <p className="text-xs text-primary mt-1">Live backend aggregation</p>
        </div>
        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <span className="label-sm text-muted-foreground">AVERAGE TICKET</span>
          <p className="text-2xl font-bold text-foreground mono-data mt-2">{formatCurrency(averageSpend)}</p>
          <p className="text-xs text-muted-foreground mt-1">Per registered transaction</p>
        </div>
        <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
          <span className="label-sm text-muted-foreground">LIVE REGISTRY</span>
          <div className="flex items-center justify-between mt-2">
            <p className="text-2xl font-bold text-foreground mono-data">{visibleExpenses.length}</p>
            <TrendingUp className="w-6 h-6 text-primary/40" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{viewMode === 'Asset' ? 'Horse-linked expenses only' : 'Facility-wide expense feed'}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 xl:flex-row xl:flex-nowrap xl:items-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ACTIVE FILTERS:</span>
        </div>
        <div className="w-full xl:w-[280px] xl:shrink-0">
          <SearchableSelect
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            placeholder="All Expense Categories"
            options={[
              { value: '', label: 'All Expense Categories' },
              ...EXPENSE_TYPES.map((type) => ({ value: type, label: type })),
            ]}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-[220px] xl:shrink-0">
          <SearchableSelect
            name="horseId"
            value={filters.horseId}
            onChange={handleFilterChange}
            placeholder="All Equine Assets"
            options={[
              { value: '', label: 'All Equine Assets' },
              ...horses.map((h) => ({ value: h.id, label: h.name })),
            ]}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-[200px] xl:shrink-0">
          <SearchableSelect
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
            placeholder="All Handlers"
            options={[
              { value: '', label: 'All Handlers' },
              ...employees.map((emp) => ({ value: emp.id, label: emp.fullName })),
            ]}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2 flex-nowrap xl:shrink-0">
          <DatePicker
            value={filters.startDate}
            onChange={(val) => handleFilterChange({ target: { name: 'startDate', value: val } })}
            size="sm"
          />
          <DatePicker
            value={filters.endDate}
            onChange={(val) => handleFilterChange({ target: { name: 'endDate', value: val } })}
            size="sm"
          />
          <ExportDialog
            title="Export Expenses"
            options={{ xlsx: handleDownloadExcel, csv: handleDownloadCSV }}
            trigger={(
              <button
                type="button"
                disabled={!visibleExpenses.length}
                className="h-8 w-8 rounded-lg border border-black/20 dark:border-white/20 text-muted-foreground flex items-center justify-center hover:bg-surface-container-high transition-colors disabled:opacity-40 shrink-0"
                aria-label="Export expenses"
                title="Export expenses"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
          />
        </div>
        {Object.values(filters).some(Boolean) && (
          <button
            type="button"
            onClick={() => {
              clearFilters();
              setCurrentPage(1);
            }}
            className="h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs hover:bg-surface-container-high transition-colors shrink-0"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={isAccountsUser ? 'lg:col-span-7 min-w-0' : 'lg:col-span-12 min-w-0'}>
          <div className="bg-surface-container-highest rounded-lg edge-glow overflow-hidden min-w-0">
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border">
              <div>
                <h2 className="heading-md text-foreground uppercase tracking-wider">Expense Ledger</h2>
                <p className="text-xs text-muted-foreground mt-1">Live entries from your current expense API.</p>
              </div>
              <span className="text-xs text-primary font-medium">{visibleExpenses.length} rows</span>
            </div>

            {loading && <div className="p-4"><TableSkeleton cols={6} rows={5} /></div>}

            {!loading && !visibleExpenses.length && (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  {Object.values(filters).some(Boolean)
                    ? 'No expenses match the current filters.'
                    : 'No expenses have been registered yet.'}
                </p>
                {Object.values(filters).some(Boolean) && (
                  <button
                    type="button"
                    onClick={() => {
                      clearFilters();
                      setCurrentPage(1);
                    }}
                    className="mt-4 h-9 px-4 rounded-lg border border-border text-foreground text-sm hover:bg-surface-container-high transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}

            {!loading && !!visibleExpenses.length && (
              <>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-5 py-3 text-left label-sm text-muted-foreground">DATE</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">CATEGORY</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">DESCRIPTION</th>
                        <th className="px-3 py-3 text-right label-sm text-muted-foreground">AMOUNT</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">ASSET</th>
                        <th className="px-3 py-3 text-left label-sm text-muted-foreground">HANDLER</th>
                        {isAccountsUser && <th className="px-3 py-3 text-right label-sm text-muted-foreground">ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedExpenses.map((expense) => {
                        const meta = categoryMeta[expense.type] || {
                          label: expense.type?.toUpperCase() || 'UNKNOWN',
                          cls: 'bg-muted text-muted-foreground border border-border',
                        };
                        return (
                          <tr key={expense.id} className="border-b border-border/30 hover:bg-surface-container-high/50 transition-colors">
                            <td className="px-5 py-4 mono-data text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(expense.date)}
                            </td>
                            <td className="px-3 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${meta.cls}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-3 py-4">
                              <p className="font-medium text-foreground">{expense.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {expense.createdBy?.fullName ? `Registered by ${expense.createdBy.fullName}` : 'Live expense entry'}
                              </p>
                            </td>
                            <td className="px-3 py-4 text-right mono-data font-bold text-foreground">
                              {formatCurrency(parseFloat(expense.amount || 0))}
                            </td>
                            <td className="px-3 py-4 text-muted-foreground">
                              {expense.horse?.name || 'Facility Wide'}
                            </td>
                            <td className="px-3 py-4 text-muted-foreground">
                              {expense.employee?.fullName || expense.createdBy?.fullName || 'Unassigned'}
                            </td>
                            {isAccountsUser && (
                              <td className="px-3 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    className="text-xs text-primary hover:underline font-medium"
                                    onClick={() => handleEdit(expense)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-destructive hover:underline font-medium"
                                    onClick={() => handleDelete(expense.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                    total={visibleExpenses.length}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {isAccountsUser && (
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="heading-md text-foreground uppercase tracking-wider">
                  {editingExpense ? 'Edit Expense' : 'Post New Entry'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">EXPENSE TYPE</label>
                  <SearchableSelect
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                    options={EXPENSE_TYPES.map((type) => ({ value: type, label: type }))}
                    placeholder="Select expense type..."
                    required
                  />
                </div>

                <div>
                  <label className="label-sm text-primary block mb-1.5">ENTRY DESCRIPTION</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Describe the expense..."
                    rows="3"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-sm text-primary block mb-1.5">AMOUNT (INR)</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleFormChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      className="w-full h-8 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm mono-data focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="label-sm text-primary block mb-1.5">ENTRY DATE</label>
                    <DatePicker
                      value={formData.date}
                      onChange={(val) => handleFormChange({ target: { name: 'date', value: val } })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label-sm text-muted-foreground block mb-1.5">ASSET ATTRIBUTION</label>
                    <SearchableSelect
                      name="horseId"
                      value={formData.horseId}
                      onChange={handleFormChange}
                      options={[{ value: '', label: 'Facility Wide' }, ...horses.map((h) => ({ value: h.id, label: h.name }))]}
                      placeholder="Facility Wide"
                    />
                  </div>
                  <div>
                    <label className="label-sm text-muted-foreground block mb-1.5">HANDLER</label>
                    <SearchableSelect
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleFormChange}
                      options={[{ value: '', label: 'Unassigned' }, ...employees.map((emp) => ({ value: emp.id, label: emp.fullName }))]}
                      placeholder="Unassigned"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-sm text-muted-foreground block mb-1.5">PROOF OF PURCHASE</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Drop or click to attach files (max 5MB each)</p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full mt-2 text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/15 file:text-primary"
                    />
                  </div>
                  {formData.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.attachments.map((file, idx) => {
                        const isUrl = typeof file === 'string';
                        const displayName = isUrl ? file.split('/').pop() : file.name;
                        return (
                          <div key={`${displayName}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-container-high px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm text-foreground truncate">{displayName}</p>
                              {isUrl && (
                                <a href={file} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                  View uploaded file
                                </a>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-xs text-destructive hover:underline shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-10 rounded-lg bg-gradient-to-r from-primary to-primary-dim text-primary-foreground text-sm font-semibold tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {loading ? 'Saving...' : editingExpense ? 'Update Expense' : 'Log Expense'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={loading}
                    className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-surface-container-highest rounded-lg p-5 edge-glow">
              <div className="flex items-center gap-2 mb-5">
                <h2 className="heading-md text-foreground uppercase tracking-wider">Live Transaction Stream</h2>
              </div>
              <div className="space-y-3">
                {latestTransactions.length ? (
                  latestTransactions.map((expense) => (
                    <div key={expense.id} className="rounded-lg border border-border bg-surface-container-high px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${categoryMeta[expense.type]?.cls || 'bg-muted text-muted-foreground border border-border'}`}>
                          {categoryMeta[expense.type]?.label || expense.type}
                        </span>
                        <span className="mono-data text-sm font-bold text-foreground">{formatCurrency(parseFloat(expense.amount || 0))}</span>
                      </div>
                      <p className="text-sm text-foreground font-medium mt-2">{expense.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {expense.horse?.name || 'Facility Wide'} · {expense.employee?.fullName || expense.createdBy?.fullName || 'Unassigned'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No transactions available for the current filters.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, id: null })}
        title="Delete Expense"
        message="Are you sure you want to delete this expense?"
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default ExpensePage;
