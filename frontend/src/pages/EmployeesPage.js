import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
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

  // Super Admin, Director, and School Administrator can add employees
  const canAddEmployee = ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation);
  // Only Director can delete employees
  const canDeleteEmployee = user?.designation === 'Director';

  useEffect(() => {
    // Load existing employees to show as supervisors
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      const employeeList = response.data.data || [];
      setEmployees(employeeList);
      // Filter supervisory roles for supervisor dropdown
      const supervisorList = employeeList.filter((emp) =>
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

  const filteredEmployees = employees.filter(
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
                  required
                  disabled={loading}
                  placeholder="John Doe"
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
                <select
                  id="supervisorId"
                  name="supervisorId"
                  value={formData.supervisorId}
                  onChange={handleInputChange}
                  disabled={loading}
                >
                  <option value="">-- Select Supervisor --</option>
                  {supervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.fullName} ({supervisor.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="123-456-7890"
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
