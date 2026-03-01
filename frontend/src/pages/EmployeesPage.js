import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import '../styles/EmployeesPage.css';

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
      });

      setMessage('Employee added successfully!');
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

  const closeModal = () => {
    setShowModal(false);
    setMessage('');
    setFormData({
      fullName: '',
      email: '',
      designation: 'Groom',
      phoneNumber: '',
      supervisorId: '',
    });
  };

  const handleApproveEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to approve this employee?')) {
      return;
    }

    try {
      await apiClient.patch(`/employees/${employeeId}/approve`);
      setMessage('Employee approved successfully!');
      loadEmployees(); // Reload list
    } catch (error) {
      console.error('Error approving employee:', error);
      setMessage('Error approving employee: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${employeeName}"? This will remove all their records and cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.delete(`/employees/${employeeId}`);
      setMessage(response.data.message || 'Employee deleted successfully!');
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      setMessage('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = getFilteredEmployeeList(employees).filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="employees-page">
      <h1>Team Members</h1>
      <p className="info-text">
        {canAddEmployee 
          ? 'You can add new employees to the system' 
          : 'Only Super Admin, Director, or School Administrator can add new employees'}
      </p>

      {canAddEmployee && (
        <button 
          className="btn-add" 
          onClick={() => setShowModal(true)}
        >
          + Add New Employee
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Employee</h2>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleAddEmployee} className="modal-form">
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
                <select
                  id="designation"
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  {EMPLOYEE_DESIGNATIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
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
      )}

      <div className="employees-list">
        <h2>📋 All Employees</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {filteredEmployees.length === 0 ? (
          <p>No employees found</p>
        ) : (
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
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.fullName}</td>
                  <td>{employee.email}</td>
                  <td>{employee.designation}</td>
                  <td>
                    {employee.supervisor 
                      ? `${employee.supervisor.fullName} (${employee.supervisor.designation})`
                      : '-'
                    }
                  </td>
                  <td>
                    <span className={employee.isApproved ? 'status-approved' : 'status-pending'}>
                      {employee.isApproved ? '✓ Approved' : '⏳ Pending'}
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
        )}
      </div>
    </div>
  );
};

export default EmployeesPage;
