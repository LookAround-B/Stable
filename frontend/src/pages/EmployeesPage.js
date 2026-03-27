import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import DirectoryMetricCard from '../components/DirectoryMetricCard';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { BriefcaseBusiness, Camera, CheckCircle2, Clock3, Download, Plus, Search, User, Users, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

// All 18 roles in the system
const EMPLOYEE_DESIGNATIONS = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Ground Supervisor',
  'Senior Executive Accounts',
  'Instructor',
  'Jamedar',
  'Guard',
  'Groom',
  'Electrician',
  'Gardener',
  'Housekeeping',
  'Executive Accounts',
  'Executive Admin',
  'Riding Boy',
  'Rider',
  'Farrier',
];

// Roles that can have subordinates
const SUPERVISORY_ROLES = [
  'Super Admin',
  'Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Ground Supervisor',
  'Senior Executive Accounts',
];

const ROLE_COLORS = {
  'Super Admin': '#c084fc',
  'Director': '#f472b6',
  'School Administrator': '#f59e0b',
  'Stable Manager': '#22c55e',
  'Ground Supervisor': '#38bdf8',
  'Senior Executive Accounts': '#60a5fa',
  'Instructor': '#fb7185',
  'Executive Accounts': '#2dd4bf',
  'Executive Admin': '#fbbf24',
  'Jamedar': '#f97316',
  'Groom': '#34d399',
  'Gardener': '#84cc16',
  'Riding Boy': '#f97316',
  'Rider': '#3b82f6',
  'Farrier': '#fb923c',
  'Guard': '#94a3b8',
  'Electrician': '#facc15',
  'Housekeeping': '#f472b6',
};

// Generate a consistent color from any string (for roles not in the map)
const hashStringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 62%)`;
};

const getRoleBadgeStyle = (designation) => {
  if (!designation) return {};
  const accent = ROLE_COLORS[designation] || hashStringToColor(designation);
  return {
    background: `${accent}18`,
    color: accent,
    borderColor: `${accent}30`,
    border: `1px solid ${accent}30`,
  };
};

const getDateValue = (...values) => {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
};

const createMonthBuckets = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      value: 0,
    };
  });
};

const buildMetricSpark = (items, getItemDate, getItemValue = () => 1, { cumulative = false, fallbackTotal = 0 } = {}) => {
  const buckets = createMonthBuckets();
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  items.forEach((item) => {
    const date = getItemDate(item);
    if (!date) return;
    const bucket = bucketMap.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (!bucket) return;
    bucket.value += getItemValue(item);
  });

  const values = buckets.map((bucket) => bucket.value);

  if (cumulative) {
    let running = 0;
    return values.map((value) => {
      running += value;
      return running;
    });
  }

  if (values.every((value) => value === 0) && fallbackTotal) {
    return buckets.map((_, index) => Math.max(1, Math.round((fallbackTotal * (index + 1)) / buckets.length)));
  }

  return values;
};

const EmployeesPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const p = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    designation: 'Groom',
    phoneNumber: '',
    supervisorId: '',
  });
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [highlightId, setHighlightId] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [newEmpImage, setNewEmpImage] = useState(null);
  const empImgRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null, name: '' });

  // Define which roles each designation can see
  // Hierarchy: Supers see all, Middles see peers+superiors+subordinates, Staff see parents+superiors+peers
  const getVisibleRoles = (userDesignation) => {
    const roleVisibility = {
      'Super Admin': null, // null means see all
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
      'Restaurant Manager': ['Restaurant Manager', 'Kitchen Helper', 'Waiter', 'Director', 'School Administrator', 'Super Admin'],
      'Kitchen Helper': ['Kitchen Helper', 'Waiter', 'Restaurant Manager', 'Director', 'School Administrator', 'Super Admin'],
      'Waiter': ['Waiter', 'Kitchen Helper', 'Restaurant Manager', 'Director', 'School Administrator', 'Super Admin'],
    };
    return roleVisibility[userDesignation];
  };

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
      'Restaurant Manager': { superiors: ['Director', 'School Administrator', 'Super Admin'], subordinates: ['Kitchen Helper', 'Waiter'] },
      'Kitchen Helper': { superiors: ['Restaurant Manager', 'Director', 'School Administrator', 'Super Admin'], subordinates: [] },
      'Waiter': { superiors: ['Restaurant Manager', 'Director', 'School Administrator', 'Super Admin'], subordinates: [] },
    };
    return hierarchy[designation] || { superiors: [], subordinates: [] };
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

  // Super Admin, Director, and School Administrator can add employees
  const canAddEmployee = ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  // Only Director can delete employees
  const canDeleteEmployee = user?.designation === 'Director';

  useEffect(() => {
    // Load existing employees to show as supervisors
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('highlight');
    if (id) {
      setHighlightId(id);
      setTimeout(() => {
        const el = document.getElementById('emp-row-' + id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      setTimeout(() => setHighlightId(null), 2200);
    }
  }, [location.search]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      const employeeList = response.data.data || [];
      setEmployees(employeeList);
      
      // Filter supervisory roles for supervisor dropdown
      const filteredEmployeeList = getFilteredEmployeeList(employeeList);
      const supervisorList = filteredEmployeeList.filter((emp) =>
        SUPERVISORY_ROLES.includes(emp.designation)
      );
      setSupervisors(supervisorList);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployees([]); // Set empty array on error
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      if (!formData.fullName || !formData.email) {
        throw new Error('Full Name and Email are required');
      }

      // Call API to create employee
      await apiClient.post('/employees', {
        fullName: formData.fullName,
        email: formData.email,
        designation: formData.designation,
        phoneNumber: formData.phoneNumber,
        supervisorId: formData.supervisorId || null,
        employmentStatus: 'Active',
        isApproved: false,
        profileImage: newEmpImage || null,
      });

      setMessage('Employee added successfully!');
      setNewEmpImage(null);
      setFormData({
        fullName: '',
        email: '',
        designation: 'Groom',
        phoneNumber: '',
        supervisorId: '',
      });
      setShowModal(false);
      
      // Reload employees
      loadEmployees();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage('Error adding employee: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resizeImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 700;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handleEmpImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await resizeImage(file);
    setNewEmpImage(base64);
    e.target.value = '';
  };

  const closeModal = () => {
    setShowModal(false);
    setMessage('');
    setNewEmpImage(null);
    setFormData({
      fullName: '',
      email: '',
      designation: 'Groom',
      phoneNumber: '',
      supervisorId: '',
    });
  };

  const handleApproveEmployee = (employeeId) => {
    setConfirmModal({ isOpen: true, type: 'approve', id: employeeId, name: '' });
  };

  const handleDeleteEmployee = (employeeId, employeeName) => {
    setConfirmModal({ isOpen: true, type: 'delete', id: employeeId, name: employeeName });
  };

  const confirmAction = async () => {
    const { type, id } = confirmModal;
    setConfirmModal({ isOpen: false, type: null, id: null, name: '' });

    if (type === 'approve') {
      try {
        await apiClient.patch(`/employees/${id}/approve`);
        setMessage('Employee approved successfully!');
        loadEmployees();
      } catch (error) {
        console.error('Error approving employee:', error);
        setMessage('Error approving employee: ' + (error.response?.data?.error || error.message));
      }
    } else if (type === 'delete') {
      try {
        setLoading(true);
        const response = await apiClient.delete(`/employees/${id}`);
        setMessage(response.data.message || 'Employee deleted successfully!');
        loadEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        setMessage('Error: ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredEmployees = getFilteredEmployeeList(employees).filter(
    (emp) =>
      (roleFilter === 'All Roles' || emp.designation === roleFilter) &&
      (
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const availableRoles = ['All Roles', ...Array.from(new Set(getFilteredEmployeeList(employees).map((emp) => emp.designation)))];

  const totalEmployees = employees.length;
  const approvedEmployees = employees.filter((emp) => emp.isApproved).length;
  const pendingEmployees = totalEmployees - approvedEmployees;
  const supervisoryEmployees = employees.filter((emp) => SUPERVISORY_ROLES.includes(emp.designation)).length;
  const employeeSpark = buildMetricSpark(
    employees,
    (employee) => getDateValue(employee.createdAt, employee.updatedAt),
    () => 1,
    { cumulative: true, fallbackTotal: totalEmployees }
  );
  const approvedSpark = buildMetricSpark(
    employees,
    (employee) => getDateValue(employee.createdAt, employee.updatedAt),
    (employee) => (employee.isApproved ? 1 : 0),
    { fallbackTotal: approvedEmployees }
  );
  const pendingSpark = buildMetricSpark(
    employees,
    (employee) => getDateValue(employee.createdAt, employee.updatedAt),
    (employee) => (employee.isApproved ? 0 : 1),
    { fallbackTotal: pendingEmployees }
  );
  const supervisorySpark = buildMetricSpark(
    employees,
    (employee) => getDateValue(employee.createdAt, employee.updatedAt),
    (employee) => (SUPERVISORY_ROLES.includes(employee.designation) ? 1 : 0),
    { fallbackTotal: supervisoryEmployees }
  );

  // Pagination logic for employees
  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  const handleDownloadExcel = () => {
    if (!filteredEmployees.length) { alert('No data to download'); return; }
    const data = filteredEmployees.map(emp => ({
      'Name': emp.fullName,
      'Email': emp.email,
      'Role': emp.designation,
      'Supervisor': emp.supervisor?.fullName || '-',
      'Phone': emp.phoneNumber || '',
      'Status': emp.employmentStatus,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, `Employees_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if (!p.manageEmployees) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">Team Directory</h1>
          <p className="text-muted-foreground mt-2 text-sm">Manage staff roles, supervisors, and contact details.</p>
        </div>
        {canAddEmployee && (
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" /> Add New Employee
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.includes('Error') ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-success/15 text-success border border-success/30'}`}>
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL STAFF', value: totalEmployees, color: 'text-primary' },
          { label: 'APPROVED', value: approvedEmployees, color: 'text-success' },
          { label: 'PENDING APPROVAL', value: pendingEmployees, color: 'text-warning' },
          { label: 'SUPERVISORY ROLES', value: supervisoryEmployees, color: 'text-primary' },
        ].map(card => (
          <div key={card.label} className="bg-surface-container-highest rounded-xl p-4 sm:p-5 edge-glow relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              <Users className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1 relative z-10">{card.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold mono-data relative z-10 ${card.color}`}>{String(card.value).padStart(2, '0')}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-surface-container-highest rounded-xl edge-glow overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-border">
          <div className="flex-1 max-w-sm flex items-center gap-2 px-4 h-10 rounded-lg bg-surface-container-high border border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder={t("Search by name, email, or role...")}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none h-full"
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48">
              <SearchableSelect
                name="employeeRoleFilter"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                options={availableRoles.map((role) => ({ value: role, label: t(role) }))}
                placeholder={t('All Roles')}
              />
            </div>
            <button
              onClick={handleDownloadExcel}
              className="h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2 shrink-0"
              title={t('Download employees')}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">{searchTerm ? t('No employees match your search') : t('No employees found')}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Supervisor</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Contact</th>
                    {(canAddEmployee || canDeleteEmployee) && <th className="px-4 sm:px-6 py-3 w-32"></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map(employee => {
                    const initials = (employee.fullName || '?').charAt(0).toUpperCase();
                    const rColor = ROLE_COLORS[employee.designation] || hashStringToColor(employee.designation);
                    const isAppr = employee.isApproved;
                    return (
                      <tr key={employee.id} id={`emp-row-${employee.id}`} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${highlightId === employee.id ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => employee.profileImage && setLightboxSrc(employee.profileImage)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${employee.profileImage ? 'cursor-pointer' : 'bg-primary/15'}`}
                            >
                              {employee.profileImage ? (
                                <img src={employee.profileImage} alt={employee.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-primary">{initials}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{employee.fullName}</p>
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: rColor + '20', color: rColor }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rColor }} />
                            {employee.designation}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-muted-foreground hidden lg:table-cell">
                          {employee.supervisor ? `${employee.supervisor.fullName} (${t(employee.supervisor.designation)})` : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${isAppr ? 'text-success' : 'text-warning'}`}>
                            <span className={`w-2 h-2 rounded-full ${isAppr ? 'bg-success' : 'bg-warning'}`} />
                            {isAppr ? t('Approved') : t('Pending')}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 font-mono text-muted-foreground hidden lg:table-cell">{employee.phoneNumber || '-'}</td>
                        {(canAddEmployee || canDeleteEmployee) && (
                          <td className="px-4 sm:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canAddEmployee && !isAppr && (
                                <button onClick={() => handleApproveEmployee(employee.id)} className="h-8 px-3 rounded bg-success/15 text-success text-xs font-medium hover:bg-success/25 transition-colors">
                                  {t('Approve')}
                                </button>
                              )}
                              {canDeleteEmployee && employee.id !== user?.id && (
                                <button onClick={() => handleDeleteEmployee(employee.id, employee.fullName)} className="h-8 px-3 rounded bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors flex items-center gap-1">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setCurrentPage(1); }}
                total={filteredEmployees.length}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container-highest rounded-xl border border-border w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{t('Add New Employee')}</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-surface-container-high transition-colors text-muted-foreground"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto">
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div
                    onClick={() => empImgRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-surface-container-high flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden group relative"
                  >
                    {newEmpImage ? (
                      <img src={newEmpImage} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <input type="file" ref={empImgRef} accept="image/*" className="hidden" onChange={handleEmpImagePick} disabled={loading} />
                  <span className="text-xs text-muted-foreground">{newEmpImage ? t('Tap to change') : t('Add Photo (optional)')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Full Name *')}</label>
                    <input id="fullName" type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} pattern="[A-Za-z\s]*" placeholder="John Doe" required disabled={loading} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Email Address *')}</label>
                    <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} required disabled={loading} placeholder="john@example.com" className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Designation/Role *')}</label>
                    <SearchableSelect name="designation" value={formData.designation} onChange={handleInputChange} options={EMPLOYEE_DESIGNATIONS.map((role) => ({ value: role, label: role }))} placeholder="Select designation..." disabled={loading} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Phone Number')}</label>
                    <input id="phoneNumber" type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} inputMode="numeric" maxLength="10" placeholder="10-digit number" disabled={loading} className="w-full h-10 px-3 rounded-lg bg-surface-container-high border border-border text-foreground text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">{t('Supervisor (Optional)')}</label>
                  <SearchableSelect id="supervisorId" name="supervisorId" value={formData.supervisorId} onChange={handleInputChange} placeholder="-- Select Supervisor --" disabled={loading} options={[{ value: '', label: '-- None --' }, ...supervisors.map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))]} />
                </div>

                {message && (
                  <div className={`mt-4 px-3 py-2 rounded-lg text-sm font-medium ${message.includes('Error') ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success'}`}>
                    {message}
                  </div>
                )}
              </form>
            </div>
            <div className="p-4 sm:p-6 border-t border-border flex justify-end gap-3 bg-surface-container-high/50">
              <button type="button" onClick={closeModal} disabled={loading} className="h-10 px-5 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-surface-container-highest transition-colors">{t('Cancel')}</button>
              <button onClick={handleAddEmployee} disabled={loading} className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">{loading ? t('Adding...') : t('Save Employee')}</button>
            </div>
          </div>
        </div>
      , document.body)}

      {lightboxSrc && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-4" onClick={() => setLightboxSrc(null)}>
          <button className="absolute top-4 right-4 p-2 bg-surface-container-high rounded-full hover:bg-border transition-colors text-foreground"><X size={20} /></button>
          <img src={lightboxSrc} className="max-w-full max-h-full rounded-lg object-contain" alt="Full view" onClick={e => e.stopPropagation()} />
        </div>
      , document.body)}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, type: null, id: null, name: '' })}
        title={confirmModal.type === 'approve' ? t('Approve Employee') : t('Delete Employee')}
        message={confirmModal.type === 'approve' 
          ? t('Are you sure you want to approve this employee?') 
          : `Are you sure you want to permanently delete "${confirmModal.name}"? This will remove all their records and cannot be undone.`}
        confirmText={confirmModal.type === 'approve' ? t('Approve') : t('Delete')}
        confirmVariant={confirmModal.type === 'approve' ? 'primary' : 'danger'}
      />
    </div>
  );
};

export default EmployeesPage;
