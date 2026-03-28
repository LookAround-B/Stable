import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import apiClient from '../services/apiClient';
import SelectField from '../components/shared/SelectField';

const PendingApprovalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || '',
    designation: user?.designation || 'Groom',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.put('/employees/profile-update', formData);
      if (response.status === 200) setSubmitted(true);
    } catch (err) {
      setError('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="lp-split-root">
      {/* Left — hero image */}
      <div className="lp-left-pane">
        <div className="lp-left-content">
          <img src="/EFM.jpg" alt="EFM" className="lp-left-logo" />
        </div>
      </div>

      {/* Right — content card */}
      <div className="lp-right-pane">
        <div className="lp-main">
          <div className="lp-card pa-card">

            {/* Branding */}
            <div className="lp-brand">
              <div className="lp-monogram">EFM</div>
              <p className="lp-subtitle">Equestrian Facility Management</p>
            </div>

            {!submitted ? (
              <>
                <div className="pa-status-badge">Account Pending Verification</div>
                <p className="pa-greeting">Welcome, <strong>{user?.fullName || user?.email}</strong>. Please complete your profile below so an admin can verify your account.</p>

                <form onSubmit={handleSubmit}>
                  <div className="lp-field">
                    <label className="lp-label">Full Name</label>
                    <input
                      className="lp-input"
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      pattern="[A-Za-z\s]*"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="lp-field">
                    <label className="lp-label">Mobile Number</label>
                    <input
                      className="lp-input"
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      inputMode="numeric"
                      maxLength="10"
                      pattern="[0-9]*"
                      placeholder="10-digit mobile number"
                      required
                    />
                  </div>

                  <div className="lp-field">
                    <label className="lp-label">Your Role</label>
                    <SelectField
                      value={formData.designation}
                      onChange={(val) => handleInputChange({ target: { name: 'designation', value: val } })}
                      options={['Select a role', 'Guard', 'Groom', 'Gardener', 'Housekeeping', 'Electrician', 'Ground Supervisor', 'Riding Boy', 'Rider', 'Instructor', 'Farrier', 'Jamedar', 'Stable Manager', 'Executive Admin']}
                    />
                  </div>

                  {error && <div className="lp-error">{error}</div>}

                  <button type="submit" className="lp-btn-primary" disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit for Approval'}
                  </button>
                </form>
              </>
            ) : (
              <div className="pa-success">
                <div className="pa-success-icon">&#10003;</div>
                <h2 className="pa-success-title">Profile Submitted</h2>
                <p className="pa-success-text">Your details have been sent to the admin team for review. You will gain access once approved.</p>

                <div className="pa-info-grid">
                  <div className="pa-info-row">
                    <span className="pa-info-label">Email</span>
                    <span className="pa-info-value">{user?.email}</span>
                  </div>
                  <div className="pa-info-row">
                    <span className="pa-info-label">Name</span>
                    <span className="pa-info-value">{formData.fullName}</span>
                  </div>
                  <div className="pa-info-row">
                    <span className="pa-info-label">Mobile</span>
                    <span className="pa-info-value">{formData.phoneNumber}</span>
                  </div>
                  <div className="pa-info-row">
                    <span className="pa-info-label">Role</span>
                    <span className="pa-info-value">{formData.designation}</span>
                  </div>
                  <div className="pa-info-row">
                    <span className="pa-info-label">Status</span>
                    <span className="pa-info-value pa-pending">Pending Approval</span>
                  </div>
                </div>
              </div>
            )}

            <button className="pa-logout-link" onClick={handleLogout}>Back to Login</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
