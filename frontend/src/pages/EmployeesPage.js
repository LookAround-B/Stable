import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import ConfirmModal from '../components/ConfirmModal';

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

const EmployeesPage = () => {
  const { user } = useAuth();
  const location = useLocation();
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

  return (
    <div className="employees-page">
      <div className="page-header">
        <div>
          <h1>Team Members</h1>
          <p className="info-text">
            {canAddEmployee 
              ? 'You can add new employees to the system' 
              : 'Only Super Admin, Director, or School Administrator can add new employees'}
          </p>
        </div>
        {canAddEmployee && (
          <button 
            className="btn-add" 
            onClick={() => setShowModal(true)}
          >
            + Add New Employee
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && ReactDOM.createPortal(
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Employee</h2>
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
                <span className="add-photo-label">{newEmpImage ? 'Tap to change photo' : 'Add Photo (optional)'}</span>
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
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
                <label htmlFor="email">Email Address *</label>
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
                <label htmlFor="designation">Designation/Role *</label>
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
                <label htmlFor="supervisorId">Supervisor (Optional)</label>
                <SearchableSelect
                  id="supervisorId"
                  name="supervisorId"
                  value={formData.supervisorId}
                  onChange={handleInputChange}
                  placeholder="-- Select Supervisor --"
                  disabled={loading}
                  options={[
                    { value: '', label: '-- Select Supervisor --' },
                    ...supervisors.map(s => ({ value: s.id, label: `${s.fullName} (${s.designation})` }))
                  ]}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number</label>
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
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      <div className="employees-list">
        <h2>All Employees</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {filteredEmployees.length === 0 ? (
          <p>No employees found</p>
        ) : (
          <>
          <div className="table-scroll-wrap">
          <table className="employees-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Supervisor</th>
                <th>Status</th>
                <th>Contact</th>
                {(canAddEmployee || canDeleteEmployee) && <th>Actions</th>}
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
                  <td><span className={`role-badge role-${(employee.designation||'').toLowerCase().replace(/\s+/g, '-')}`}>{employee.designation}</span></td>
                  <td>
                    {employee.supervisor 
                      ? `${employee.supervisor.fullName} (${employee.supervisor.designation})`
                      : '-'
                    }
                  </td>
                  <td>
                    <span className={employee.isApproved ? 'status-approved' : 'status-pending'}>
                      {employee.isApproved ? '✔ Approved' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>{employee.phoneNumber || 'N/A'}</td>
                  {(canAddEmployee || canDeleteEmployee) && (
                    <td>
                      {canAddEmployee && !employee.isApproved && (
                        <button
                          className="btn-approve"
                          onClick={() => handleApproveEmployee(employee.id)}
                        >
                          ✓ Approve
                        </button>
                      )}
                      {canDeleteEmployee && employee.id !== user?.id && (
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteEmployee(employee.id, employee.fullName)}
                          style={{ marginLeft: '8px', background: '#e74c3c', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          🗑 Delete
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
        title={confirmModal.type === 'approve' ? 'Approve Employee' : 'Delete Employee'}
        message={confirmModal.type === 'approve' 
          ? 'Are you sure you want to approve this employee?' 
          : `Are you sure you want to permanently delete "${confirmModal.name}"? This will remove all their records and cannot be undone.`}
        confirmText={confirmModal.type === 'approve' ? 'Approve' : 'Delete'}
        confirmVariant={confirmModal.type === 'approve' ? 'primary' : 'danger'}
      />
    </div>
  );
};

export default EmployeesPage;
