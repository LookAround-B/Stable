import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import expenseService from '../services/expenseService';
import SearchableSelect from '../components/SearchableSelect';
import '../styles/ExpensePage.css';
import * as XLSX from 'xlsx';

const ExpensePage = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [message, setMessage] = useState('');
  const [horses, setHorses] = useState([]);
  const [employees, setEmployees] = useState([]);

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
      console.log('Loading expenses with filters:', filters);
      const data = await expenseService.getAllExpenses(filters);
      console.log('Expenses data received:', data);
      if (data.expenses && data.expenses.length > 0) {
        console.log('📋 Sample expense with horse data:', {
          id: data.expenses[0].id,
          horseId: data.expenses[0].horseId,
          horse: data.expenses[0].horse,
          employeeId: data.expenses[0].employeeId,
          employee: data.expenses[0].employee,
        });
      }
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('✗ Error loading expenses:', error);
      setMessage(`✗ Error loading expenses: ${error.error || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadHorses = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'https://horsestablebackend.vercel.app/api';
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
      const apiUrl = process.env.REACT_APP_API_URL || 'https://horsestablebackend.vercel.app/api';
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
    console.log(`🔄 Form field changed: ${name} = ${value}`);
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      console.log(`📝 Updated formData:`, updated);
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
        setMessage(`✗ File ${file.name} exceeds 5MB limit`);
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

      console.log('📨 Submitting expense with formData:', formData);
      console.log('📨 Final submitData:', submitData);

      if (editingExpense) {
        const updatedExpense = await expenseService.updateExpense(editingExpense.id, submitData);
        console.log('✅ Expense updated:', updatedExpense);
        console.log('   📝 Returned horseId:', updatedExpense.horseId);
        console.log('   📝 Returned employeeId:', updatedExpense.employeeId);
        setMessage('✓ Expense updated successfully!');
      } else {
        const createdExpense = await expenseService.createExpense(submitData);
        console.log('✅ Expense created:', createdExpense);
        console.log('   📝 Returned horseId:', createdExpense.horseId);
        console.log('   📝 Returned horseId:', createdExpense.horseId);
        console.log('   📝 Returned employeeId:', createdExpense.employeeId);
      }

      resetForm();
      await loadExpenses();
      setMessage('✓ Expense saved successfully!');

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`✗ Error: ${error.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense) => {
    console.log('📝 EDIT EXPENSE DATA:', expense);
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
    setShowForm(true);
  };

  const handleDownloadExcel = () => {
    if (expenses.length === 0) {
      alert('No expenses to download');
      return;
    }

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount) => {
      return `₹ ${parseFloat(amount || 0).toFixed(2)}`;
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
    console.log('📥 Downloaded expenses to:', filename);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        setLoading(true);
        await expenseService.deleteExpense(id);
        setMessage('✓ Expense deleted successfully!');
        await loadExpenses();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage(`✗ Error deleting expense: ${error.error}`);
      } finally {
        setLoading(false);
      }
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
    setShowForm(false);
  };

  const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

  return (
    <div className="expense-page">
      <div className="expense-header">
        <h1>Expense Tracking</h1>
        {isAccountsUser && (
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Expense
          </button>
        )}
      </div>

      {message && <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>{message}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Expense Type</label>
          <select name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="">All Types</option>
            {EXPENSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Horse</label>
          <SearchableSelect
            name="horseId"
            value={filters.horseId}
            onChange={handleFilterChange}
            placeholder="All Horses"
            options={[
              { value: '', label: 'All Horses' },
              ...horses.map(h => ({ value: h.id, label: h.name }))
            ]}
          />
        </div>

        <div className="filter-group">
          <label>Employee</label>
          <SearchableSelect
            name="employeeId"
            value={filters.employeeId}
            onChange={handleFilterChange}
            placeholder="All Employees"
            options={[
              { value: '', label: 'All Employees' },
              ...employees.map(emp => ({ value: emp.id, label: emp.fullName }))
            ]}
          />
        </div>

        <div className="filter-group">
          <label>From Date</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-group">
          <label>To Date</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Form */}
      {showForm && isAccountsUser && (
        <div className="expense-form-section">
          <h2>{editingExpense ? 'Edit Expense' : 'New Expense'}</h2>
          <form onSubmit={handleSubmit} className="expense-form">
            <div className="form-group">
              <label htmlFor="type-select">Expense Type *</label>
              <select
                id="type-select"
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                required
              >
                <option value="">Select Type</option>
                {EXPENSE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount-input">Amount (₹) *</label>
              <input
                id="amount-input"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleFormChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description-textarea">Description *</label>
              <textarea
                id="description-textarea"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Enter expense details"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="date-input">Date *</label>
              <input
                id="date-input"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="horse-select">Horse</label>
                {editingExpense && editingExpense.horseId && editingExpense.horse && (
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '3px', fontWeight: '500' }}>
                    ✓ {editingExpense.horse.name}
                  </div>
                )}
                {editingExpense && !editingExpense.horseId && (
                  <div style={{ fontSize: '13px', color: '#999', marginBottom: '5px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                    (No horse assigned)
                  </div>
                )}
                {!editingExpense && (
                  <div style={{ fontSize: '13px', color: '#999', marginBottom: '5px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                    Select a horse for this expense
                  </div>
                )}
                <SearchableSelect
                  id="horse-select"
                  name="horseId"
                  value={formData.horseId}
                  onChange={(e) => {
                    console.log(`🐴 Horse selected: ${e.target.value}`);
                    handleFormChange(e);
                  }}
                  placeholder={editingExpense ? '-- Change Horse --' : 'Select Horse'}
                  options={[
                    { value: '', label: editingExpense ? '-- Change Horse --' : 'Select Horse' },
                    ...horses.map(h => ({ value: h.id, label: h.name }))
                  ]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="employee-select">Employee</label>
                {editingExpense && editingExpense.employeeId && editingExpense.employee && (
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '3px', fontWeight: '500' }}>
                    ✓ {editingExpense.employee.fullName}
                  </div>
                )}
                {editingExpense && !editingExpense.employeeId && (
                  <div style={{ fontSize: '13px', color: '#999', marginBottom: '5px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                    (No employee assigned)
                  </div>
                )}
                {!editingExpense && (
                  <div style={{ fontSize: '13px', color: '#999', marginBottom: '5px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '3px' }}>
                    Select an employee for this expense
                  </div>
                )}
                <SearchableSelect
                  id="employee-select"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => {
                    console.log(`👤 Employee selected: ${e.target.value}`);
                    handleFormChange(e);
                  }}
                  placeholder={editingExpense ? '-- Change Employee --' : 'Select Employee'}
                  options={[
                    { value: '', label: editingExpense ? '-- Change Employee --' : 'Select Employee' },
                    ...employees.map(emp => ({ value: emp.id, label: emp.fullName }))
                  ]}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="attachments-input">Attachments (Bill/Images) - Max 5MB</label>
              <input
                id="attachments-input"
                type="file"
                multiple
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />
              {formData.attachments.length > 0 && (
                <div className="file-list">
                  {formData.attachments.map((file, idx) => {
                    const isUrl = typeof file === 'string';
                    const displayName = isUrl ? file.split('/').pop() : file.name;
                    return (
                      <div key={idx} className="file-item">
                        <span>
                          {isUrl ? '📎' : '📄'} {displayName}
                        </span>
                        {isUrl && (
                          <a href={file} target="_blank" rel="noopener noreferrer" className="file-link">
                            View
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => removeAttachment(idx)}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Expense'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses List */}
      <div className="expenses-list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0 }}>Expenses ({expenses.length})</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {expenses.length > 0 && (
              <button
                className="btn-primary"
                onClick={handleDownloadExcel}
                style={{ padding: '8px 16px', fontSize: '13px' }}
                title="Download filtered expenses as Excel"
              >
                📥 Download Excel
              </button>
            )}
            {(filters.type || filters.horseId || filters.employeeId || filters.startDate || filters.endDate) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setFilters({
                    type: '',
                    horseId: '',
                    employeeId: '',
                    startDate: '',
                    endDate: '',
                  });
                }}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#666' }}>⏳ Loading expenses...</p>}
        
        {!loading && expenses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <p style={{ color: '#999', marginBottom: '10px' }}>
              {Object.values(filters).some(v => v) 
                ? '❌ No expenses found with these filters' 
                : '📭 No expenses created yet'}
            </p>
            {Object.values(filters).some(v => v) && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setFilters({
                    type: '',
                    horseId: '',
                    employeeId: '',
                    startDate: '',
                    endDate: '',
                  });
                }}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {!loading && expenses.length > 0 && (
          <div className="table-responsive">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Assigned Horse</th>
                  <th>Assigned Employee</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>
                      <span className={`badge badge-${expense.type ? expense.type.toLowerCase() : 'unknown'}`}>
                        {expense.type || '(no type)'}
                      </span>
                    </td>
                    <td>{expense.description}</td>
                    <td className="amount">{formatCurrency(expense.amount)}</td>
                    <td>{expense.horse?.name || '-'}</td>
                    <td>{expense.employee?.fullName || '-'}</td>
                    <td>{expense.createdBy?.fullName}</td>
                    <td className="actions">
                      {isAccountsUser && (
                        <>
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(expense)}
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(expense.id)}
                            title="Delete"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensePage;
