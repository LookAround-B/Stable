import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

const ROLES_WITH_HORSES = [
  'Groom',
  'Riding Boy',
  'Rider',
  'Jamedar',
  'Instructor',
  'Stable Manager',
  'Ground Supervisor'
];

const ProfilePage = () => {
  const { user } = useAuth();
  const [assignedHorses, setAssignedHorses] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAssignedHorses = useCallback(async () => {
    try {
      setLoading(true);
      // Get the care team assignments for this user
      const response = await apiClient.get('/horse-care-team');
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      
      // Filter assignments where this user is the staff member
      const userAssignments = data.filter(assignment => assignment.staffId === user?.id);
      
      // Extract horse information
      const horses = userAssignments.map(assignment => ({
        id: assignment.horseId,
        name: assignment.horse?.name || 'Unknown',
        role: assignment.role,
        breed: assignment.horse?.breed || '-',
        stableNumber: assignment.horse?.stableNumber || '-'
      }));
      
      setAssignedHorses(horses);
    } catch (error) {
      console.error('Error loading assigned horses:', error);
      setAssignedHorses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user && ROLES_WITH_HORSES.includes(user.designation)) {
      loadAssignedHorses();
    }
  }, [user, loadAssignedHorses]);

  if (!user) {
    return (
      <div className="profile-page">
        <div className="no-user">
          <p>Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Hero Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-bg" />
          <div className="profile-hero-content">
            <div className="profile-avatar-wrap">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-initials">👨</div>
              )}
              <span className={`profile-status-dot ${user.isApproved ? 'online' : 'pending'}`} />
            </div>
            <div className="profile-hero-info">
              <h1 className="profile-hero-name">{user.fullName || 'User'}</h1>
              <p className="profile-hero-designation">{user.designation || 'Staff'}</p>
              <div className="profile-hero-meta">
                <span className={`profile-status-badge ${user.isApproved ? 'approved' : 'pending'}`}>
                  {user.isApproved ? '✓ Approved' : '⧖ Pending Approval'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="profile-cards-grid">
          {/* Personal Information */}
          <div className="profile-info-card">
            <div className="profile-card-header">
              <span className="profile-card-icon">👤</span>
              <h3>Personal Information</h3>
            </div>
            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field-label">Full Name</span>
                <span className="profile-field-value">{user.fullName || '—'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Employee ID</span>
                <span className="profile-field-value profile-field-mono">{user.employeeId || user.id?.slice(0, 8) || '—'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Designation</span>
                <span className="profile-field-value">{user.designation || '—'}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Employment Status</span>
                <span className="profile-field-value">{user.employmentStatus || 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="profile-info-card">
            <div className="profile-card-header">
              <span className="profile-card-icon">📬</span>
              <h3>Contact Information</h3>
            </div>
            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field-label">Email Address</span>
                <a href={`mailto:${user.email}`} className="profile-field-value profile-field-link">{user.email || '—'}</a>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Phone Number</span>
                {user.phoneNumber || user.mobile ? (
                  <a href={`tel:${user.phoneNumber || user.mobile}`} className="profile-field-value profile-field-link">
                    {user.phoneNumber || user.mobile}
                  </a>
                ) : (
                  <span className="profile-field-value">—</span>
                )}
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Account Type</span>
                <span className="profile-field-value">{user.googleId ? '🔗 Google Account' : '🔑 Email & Password'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Horses Section */}
        {ROLES_WITH_HORSES.includes(user.designation) && (
          <div className="profile-horses-section">
            <div className="profile-card-header">
              <span className="profile-card-icon">🐴</span>
              <h3>Assigned Horses</h3>
              <span className="profile-horse-count">{assignedHorses.length}</span>
            </div>
            {loading ? (
              <p className="loading">Loading assigned horses...</p>
            ) : assignedHorses.length > 0 ? (
              <div className="profile-horses-grid">
                {assignedHorses.map(horse => (
                  <div key={horse.id} className="profile-horse-card">
                    <div className="profile-horse-icon">🐴</div>
                    <div className="profile-horse-details">
                      <div className="profile-horse-name">{horse.name}</div>
                      <div className="profile-horse-meta">
                        <span>Stable #{horse.stableNumber}</span>
                        <span>·</span>
                        <span>{horse.breed}</span>
                      </div>
                      <span className="profile-horse-role">{horse.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-horses">No horses assigned yet</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfilePage;
