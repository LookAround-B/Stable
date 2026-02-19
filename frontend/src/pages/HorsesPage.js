import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/HorsesPage.css';

const SUPERVISORY_ROLES = [
  'Super Admin',
  'Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Ground Supervisor',
  'Senior Executive Accounts',
];

const HorsesPage = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [horses, setHorses] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    gender: 'Male',
    breed: '',
    color: '',
    dateOfBirth: '',
    height: '',
    stableNumber: '',
    supervisorId: '',
  });
  const [message, setMessage] = useState('');

  // Leadership and Stable Operations management can add horses
  const canAddHorse = [
    'Super Admin',
    'Director',
    'School Administrator',
    'Stable Manager',
    'Instructor'
  ].includes(user?.designation);

  useEffect(() => {
    loadHorsesAndSupervisors();
  }, []);

  const loadHorsesAndSupervisors = async () => {
    try {
      const [horsesRes, employeesRes] = await Promise.all([
        apiClient.get('/horses'),
        apiClient.get('/employees'),
      ]);
      
      const horsesList = horsesRes.data.data || [];
      const employeesList = employeesRes.data.data || [];
      
      setHorses(horsesList);
      
      // Filter supervisory roles for supervisor dropdown
      const supervisorList = employeesList.filter((emp) =>
        SUPERVISORY_ROLES.includes(emp.designation) && emp.isApproved
      );
      setSupervisors(supervisorList);
    } catch (error) {
      console.error('Error loading data:', error);
      setHorses([]); // Set empty array on error
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Generate random alphanumeric stable number (e.g., A12, B7, ST-09)
  const generateStableNumber = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const formats = [
      () => letters.charAt(Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 100), // A12
      () => letters.substring(0, 2).split('').map(() => letters.charAt(Math.floor(Math.random() * 26))).join('') + '-' + Math.floor(Math.random() * 100).toString().padStart(2, '0'), // ST-09
      () => letters.charAt(Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 10), // B7
    ];
    const format = formats[Math.floor(Math.random() * formats.length)];
    return format();
  };

  const handleAddHorse = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate required fields
      if (!formData.name || !formData.gender) {
        throw new Error('Name and Gender are required');
      }

      // Generate stable number if not provided
      const stableNumber = formData.stableNumber || generateStableNumber();

      // Call API to create horse
      await apiClient.post('/horses', {
        name: formData.name,
        gender: formData.gender,
        breed: formData.breed,
        color: formData.color,
        dateOfBirth: formData.dateOfBirth || null,
        height: formData.height ? parseFloat(formData.height) : null,
        stableNumber: stableNumber,
        supervisorId: formData.supervisorId || null,
        status: 'Active',
      });

      setMessage('Horse added successfully!');
      
      // Reload horses
      loadHorsesAndSupervisors();
      
      // Reset form
      setFormData({
        name: '',
        gender: 'Male',
        breed: '',
        color: '',
        dateOfBirth: '',
        height: '',
        stableNumber: '',
        supervisorId: '',
      });
      setShowModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setMessage('Error adding horse: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setMessage('');
    setFormData({
      name: '',
      gender: 'Male',
      breed: '',
      color: '',
      dateOfBirth: '',
      height: '',
      stableNumber: '',
      supervisorId: '',
    });
  };

  // Get horses assigned to current user (if supervisor)
  const myHorses = horses.filter((horse) => horse.supervisorId === user?.id);

  // Filter horses based on search term
  const filteredHorses = horses.filter((horse) =>
    horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (horse.breed && horse.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.color && horse.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.gender && horse.gender.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.stableNumber && horse.stableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMyHorses = myHorses.filter((horse) =>
    horse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (horse.breed && horse.breed.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.color && horse.color.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.gender && horse.gender.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (horse.stableNumber && horse.stableNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="horses-page">
      <h1>🐴 Horses</h1>
      <p className="info-text">
        {canAddHorse 
          ? 'You can add new horses to the system' 
          : 'Only Admin and Instructor can add horses'}
      </p>

      {canAddHorse && (
        <button 
          className="btn-add" 
          onClick={() => setShowModal(true)}
        >
          + Add New Horse
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Horse</h2>
              <button className="close-btn" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleAddHorse} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Horse Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Shadow"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="gender">Gender *</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="breed">Breed</label>
                  <input
                    id="breed"
                    type="text"
                    name="breed"
                    value={formData.breed}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="Thoroughbred"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="color">Color</label>
                  <input
                    id="color"
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="Black"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="height">Height (hands)</label>
                  <input
                    id="height"
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="16.2"
                    step="0.1"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="stableNumber">Unique Stable Number (Optional)</label>
                  <input
                    id="stableNumber"
                    type="text"
                    name="stableNumber"
                    value={formData.stableNumber}
                    onChange={handleInputChange}
                    disabled={loading}
                    placeholder="(ST-09)"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="supervisorId">Assign to Manager</label>
                  <select
                    id="supervisorId"
                    name="supervisorId"
                    value={formData.supervisorId}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="">-- No Assignment --</option>
                    {supervisors.map((supervisor) => (
                      <option key={supervisor.id} value={supervisor.id}>
                        {supervisor.fullName} ({supervisor.designation})
                      </option>
                    ))}
                  </select>
                </div>
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
                  {loading ? 'Adding...' : 'Add Horse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My Horses Section - Only for staff roles, not admin/supervisory */}
      {!SUPERVISORY_ROLES.includes(user?.designation) && (
        <div className="team-section">
          <h2>🐴 Horses Under My Care</h2>
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Search by name, stable number, breed, color, gender..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          {filteredMyHorses.length === 0 ? (
            <p className="info-text">
              {searchTerm ? 'No horses match your search' : 'No horses assigned to you'}
            </p>
          ) : (
            <table className="horses-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stable Number</th>
                  <th>Gender</th>
                  <th>Breed</th>
                  <th>Color</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyHorses.map((horse) => (
                  <tr key={horse.id}>
                    <td>{horse.name}</td>
                    <td>{horse.stableNumber}</td>
                    <td>{horse.gender}</td>
                    <td>{horse.breed || ''}</td>
                    <td>{horse.color || ''}</td>
                    <td>{horse.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="horses-list">
        <h2>📋 All Horses</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search by name, stable number, breed, color, gender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {filteredHorses.length === 0 ? (
          <p className="info-text">
            {searchTerm ? 'No horses match your search' : 'No horses found'}
          </p>
        ) : (
          <table className="horses-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Stable Number</th>
                <th>Gender</th>
                <th>Breed</th>
                <th>Color</th>
                <th>Manager</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHorses.map((horse) => (
                <tr key={horse.id}>
                  <td>{horse.name}</td>
                  <td>{horse.stableNumber}</td>
                  <td>{horse.gender}</td>
                  <td>{horse.breed || ''}</td>
                  <td>{horse.color || ''}</td>
                  <td>
                    {horse.supervisor
                      ? `${horse.supervisor.fullName} (${horse.supervisor.designation})`
                      : '-'
                    }
                  </td>
                  <td>{horse.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HorsesPage;
