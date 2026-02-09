import React, { useState } from 'react';
import { createProfile, setToken } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import '../styles/ProfileSetupPage.css';

const DESIGNATIONS = ['Groomer', 'Zamindar', 'Instructor', 'Admin', 'Health Advisor', 'Super Admin'];

const ProfileSetupPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    designation: 'Groomer',
    profileImage: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      profileImage: e.target.files[0],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('fullName', formData.fullName);
      data.append('phoneNumber', formData.phoneNumber);
      data.append('designation', formData.designation);
      if (formData.profileImage) {
        data.append('profileImage', formData.profileImage);
      }

      const response = await createProfile(data);
      setToken(response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Profile setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-page">
      <div className="profile-container">
        <h1>Complete Your Profile</h1>
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              disabled={loading}
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
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="designation">Role/Designation</label>
            <select
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
              disabled={loading}
            >
              {DESIGNATIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="profileImage">Profile Picture</label>
            <input
              id="profileImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Setting up profile...' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
