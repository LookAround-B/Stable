import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/authService';
import '../styles/PendingApprovalPage.css';

const PendingApprovalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
          <p>
            Please wait for some time to get verified. The admin team will review your account and approve it shortly.
          </p>
        </div>

        <div className="pending-info">
          <div className="info-box">
            <div className="info-label">📧 Email:</div>
            <div className="info-value">{user?.email}</div>
          </div>
          
          <div className="info-box">
            <div className="info-label">👤 Name:</div>
            <div className="info-value">{user?.fullName}</div>
          </div>
          
          <div className="info-box">
            <div className="info-label">👨‍💼 Role:</div>
            <div className="info-value">{user?.designation}</div>
          </div>
          
          <div className="info-box">
            <div className="info-label">📋 Status:</div>
            <div className="info-value status-pending">⏳ Pending Approval</div>
          </div>
        </div>

        <div className="pending-steps">
          <h3>What happens next?</h3>
          <ol>
            <li>An admin will review your account details</li>
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
