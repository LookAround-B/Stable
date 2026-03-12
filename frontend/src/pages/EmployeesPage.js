import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';
import { Search } from 'lucide-react';
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

// Color palette for role badges - covers predefined + generates for any custom role
const ROLE_COLORS = {
  'Super Admin':               { bg: '#d1c4e9', color: '#311b92', border: '#9575cd' },
  'Director':                  { bg: '#f8bbd0', color: '#880e4f', border: '#ec407a' },
  'School Administrator':      { bg: '#ffe0b2', color: '#bf360c', border: '#ff9800' },
  'Stable Manager':            { bg: '#b2dfdb', color: '#004d40', border: '#26a69a' },
  'Ground Supervisor':         { bg: '#bbdefb', color: '#0d47a1', border: '#42a5f5' },
  'Senior Executive Accounts': { bg: '#c5cae9', color: '#1a237e', border: '#7986cb' },
  'Instructor':                { bg: '#c8e6c9', color: '#1b5e20', border: '#66bb6a' },
  'Executive Accounts':        { bg: '#b3e5fc', color: '#01579b', border: '#29b6f6' },
  'Executive Admin':           { bg: '#e1bee7', color: '#4a148c', border: '#ab47bc' },
  'Jamedar':                   { bg: '#ffecb3', color: '#e65100', border: '#ffa726' },
  'Groom':                     { bg: '#b2ebf2', color: '#006064', border: '#26c6da' },
  'Gardener':                  { bg: '#dcedc8', color: '#33691e', border: '#8bc34a' },
  'Riding Boy':                { bg: '#bbdefb', color: '#0d47a1', border: '#42a5f5' },
  'Rider':                     { bg: '#90caf9', color: '#0a3d91', border: '#1e88e5' },
  'Farrier':                   { bg: '#d7ccc8', color: '#3e2723', border: '#8d6e63' },
  'Guard':                     { bg: '#cfd8dc', color: '#263238', border: '#78909c' },
  'Electrician':               { bg: '#fff9c4', color: '#e65100', border: '#ffee58' },
  'Housekeeping':              { bg: '#f8bbd0', color: '#880e4f', border: '#ec407a' },
};

// Generate a consistent color from any string (for roles not in the map)
const hashStringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 55%, 85%)`,
    color: `hsl(${hue}, 70%, 25%)`,
    border: `hsl(${hue}, 55%, 65%)`,
  };
};

const getRoleBadgeStyle = (designation) => {
  if (!designation) return {};
  const c = ROLE_COLORS[designation] || hashStringToColor(designation);
  return {
    background: c.bg,
    color: c.color,
    borderColor: c.border,
    border: `1px solid ${c.border}`,
  };
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
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (!p.manageEmployees) return <Navigate to="/" replace />;

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>{t('Team Members')}</h1>
          <p className="info-text">
            {canAddEmployee 
              ? t('You can add new employees to the system') 
              : t('Only Super Admin, Director, or School Administrator can add new employees')}
          </p>
        </div>
        {canAddEmployee && (
          <button 
            className="btn-add" 
            onClick={() => setShowModal(true)}
          >
            {t('+ Add New Employee')}
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{t('Add New Employee')}</h2>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleAddEmployee} className="modal-form">
              {/* Photo picker */}
              <div className="add-photo-picker">
                <div className="add-photo-avatar" onClick={() => empImgRef.current?.click()}>
                  {newEmpImage
                    ? <img src={newEmpImage} alt="preview" className="add-photo-preview" />
                    : <span className="add-photo-placeholder">👤</span>
                  }
                  <div className="add-photo-overlay">📷</div>
                </div>
                <input type="file" ref={empImgRef} accept="image/*" style={{display:'none'}} onChange={handleEmpImagePick} disabled={loading} />
                <span className="add-photo-label">{newEmpImage ? t('Tap to change photo') : t('Add Photo (optional)')}</span>
              </div>

              <div className="form-group">
                <label htmlFor="fullName">{t('Full Name *')}</label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  pattern="[A-Za-z\s]*"
                  placeholder="John Doe (letters and spaces only)"
                  required
                  disabled={loading}
                  title="Name should only contain letters and spaces"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">{t('Email Address *')}</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="john@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="designation">{t('Designation/Role *')}</label>
                <SearchableSelect
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  options={EMPLOYEE_DESIGNATIONS.map((role) => ({ value: role, label: role }))}
                  placeholder="Select designation..."
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="supervisorId">{t('Supervisor (Optional)')}</label>
                <SearchableSelect
                  id="supervisorId"
                  name="supervisorId"
                  value={formData.supervisorId}
                  onChange={handleInputChange}
                  placeholder="-- Select Supervisor --"
                  disabled={loading}
                  options={[
                    { value: '', label: '-- Select Supervisor --' },
                    ...supervisors.map(s => ({ value: s.id, label: `${s.fullName} (${t(s.designation)})` }))
                  ]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">{t('Phone Number')}</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  maxLength="10"
                  pattern="[0-9]*"
                  placeholder="10-digit phone number"
                  disabled={loading}
                  title="Phone number should contain only 10 digits"
                />
              </div>

              {message && (
                <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
                  {message}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={closeModal}
                  disabled={loading}
                >
                  {t('Cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={loading}
                >
                  {loading ? t('Adding...') : t('Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      <div className="employees-list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>{t('All Employees')}</h2>
          <button className="btn-secondary" onClick={handleDownloadExcel}>Download Excel</button>
        </div>
        <div className="search-bar" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', color: 'rgba(0,0,0,.38)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={t("Search by name, email, or role...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ paddingLeft: '32px' }}
          />
        </div>
        {filteredEmployees.length === 0 ? (
          <p>{t('No employees found')}</p>
        ) : (
          <>
          <div className="table-scroll-wrap">
          <table className="employees-table">
            <thead>
              <tr>
                <th>{t('Name')}</th>
                <th>{t('Email')}</th>
                <th>{t('Role')}</th>
                <th>{t('Supervisor')}</th>
                <th>{t('Status')}</th>
                <th>{t('Contact')}</th>
                {(canAddEmployee || canDeleteEmployee) && <th>{t('Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedEmployees.map((employee) => (
                <tr key={employee.id} id={`emp-row-${employee.id}`} className={highlightId === employee.id ? 'row-highlight' : ''}>
                  <td>
                    <div className="emp-name-cell">
                      <div
                        className="emp-avatar"
                        onClick={() => employee.profileImage && setLightboxSrc(employee.profileImage)}
                        style={employee.profileImage ? {cursor:'pointer'} : {}}
                      >
                        {employee.profileImage
                          ? <img src={employee.profileImage} alt={employee.fullName} className="emp-avatar-img" />
                          : <span className="emp-avatar-initials">{(employee.fullName || '?').charAt(0).toUpperCase()}</span>
                        }
                      </div>
                      <span>{employee.fullName}</span>
                    </div>
                  </td>
                  <td>{employee.email}</td>
                  <td><span className="role-badge" style={getRoleBadgeStyle(employee.designation)}>{t(employee.designation)}</span></td>
                  <td>
                    {employee.supervisor 
                      ? `${employee.supervisor.fullName} (${t(employee.supervisor.designation)})`
                      : '-'
                    }
                  </td>
                  <td>
                    <span className={employee.isApproved ? 'status-approved' : 'status-pending'}>
                      {employee.isApproved ? t('✔ Approved') : t('⏳ Pending')}
                    </span>
                  </td>
                  <td>{employee.phoneNumber || t('N/A')}</td>
                  {(canAddEmployee || canDeleteEmployee) && (
                    <td>
                      {canAddEmployee && !employee.isApproved && (
                        <button
                          className="btn-approve"
                          onClick={() => handleApproveEmployee(employee.id)}
                        >
                          {t('✓ Approve')}
                        </button>
                      )}
                      {canDeleteEmployee && employee.id !== user?.id && (
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteEmployee(employee.id, employee.fullName)}
                          style={{ marginLeft: '8px', background: '#e74c3c', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {t('🗑 Delete')}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            </table>
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(newRows) => {
                setRowsPerPage(newRows);
                setCurrentPage(1);
              }}
              total={filteredEmployees.length}
            />
            </div>
          </>
          )}
        </div>

      {lightboxSrc && ReactDOM.createPortal(
        <div className="lightbox-overlay" onClick={() => setLightboxSrc(null)}>
          <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} className="lightbox-img" alt="Full view" onClick={e => e.stopPropagation()} />
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
