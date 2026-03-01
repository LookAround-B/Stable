import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import apiClient from '../services/apiClient';
import '../styles/PendingApprovalPage.css';

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.put('/employees/profile-update', formData);
      
      if (response.status === 200) {
        setSubmitted(true);
      }
    } catch (err) {
      setError('Failed to submit form. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pending-approval-page">
      <div className="pending-container">
        <div className="pending-icon">⏳</div>
        
        <h1>Account Pending Approval</h1>
        
        <div className="pending-message">
          <p>
            <strong>Hello {user?.fullName}!</strong>
          </p>
          <p>
            Your account is currently <strong>awaiting admin verification</strong>.
          </p>
          <p className="main-message">
            ✋ You're not verified yet by the admins...
          </p>
        </div>

        {!submitted ? (
          <form className="pending-form" onSubmit={handleSubmit}>
            <h2>Complete Your Profile</h2>
            <p className="form-subtitle">Please provide your details below. Admins will review and approve your account.</p>

            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                pattern="[A-Za-z\s]*"
                placeholder="Enter your full name (letters and spaces only)"
                required
                title="Name should only contain letters and spaces"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Mobile Number *</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                inputMode="numeric"
                maxLength="10"
                pattern="[0-9]*"
                placeholder="10-digit mobile number"
                required
                title="Phone number should contain only 10 digits"
              />
            </div>

            <div className="form-group">
              <label htmlFor="designation">Role *</label>
              <select
                id="designation"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a role</option>
                <option value="Guard">Guard</option>
                <option value="Groom">Groom</option>
                <option value="Gardener">Gardener</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="Electrician">Electrician</option>
                <option value="Ground Supervisor">Ground Supervisor</option>
                <option value="Riding Boy">Riding Boy</option>
                <option value="Rider">Rider</option>
                <option value="Instructor">Instructor</option>
                <option value="Farrier">Farrier</option>
                <option value="Jamedar">Jamedar</option>
                <option value="Stable Manager">Stable Manager</option>
                <option value="Executive Admin">Executive Admin</option>
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </form>
        ) : (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Profile Submitted Successfully!</h2>
            <p>Your profile details have been submitted to the admin team.</p>
            <p>Please wait for approval. You'll be able to access the system once approved.</p>
          </div>
        )}

        {submitted && (
          <div className="pending-info">
            <h3>Your Submitted Details:</h3>
            <div className="info-box">
              <div className="info-label">📧 Email:</div>
              <div className="info-value">{user?.email}</div>
            </div>
            
            <div className="info-box">
              <div className="info-label">👤 Name:</div>
              <div className="info-value">{formData.fullName}</div>
            </div>
            
            <div className="info-box">
              <div className="info-label">📱 Mobile:</div>
              <div className="info-value">{formData.phoneNumber}</div>
            </div>
            
            <div className="info-box">
              <div className="info-label">👨‍💼 Role:</div>
              <div className="info-value">{formData.designation}</div>
            </div>
            
            <div className="info-box">
              <div className="info-label">📋 Status:</div>
              <div className="info-value status-pending">⏳ Pending Approval</div>
            </div>
          </div>
        )}

        <div className="pending-steps">
          <h3>What happens next?</h3>
          <ol>
            <li>An admin will review your submitted details</li>
            <li>They will verify your information</li>
            <li>Once approved, you'll receive access to the system</li>
            <li>You can then log in and use all features</li>
          </ol>
        </div>

        <div className="pending-note">
          <p>💡 <strong>Note:</strong> This usually takes a few hours. Please check back later or refresh the page.</p>
        </div>

        <div className="pending-contact">
          <p>Questions? Contact the admin team for assistance.</p>
        </div>

        <button className="btn-back-login" onClick={handleLogout}>
          ← Back to Login
        </button>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
