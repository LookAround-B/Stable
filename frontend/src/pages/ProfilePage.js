import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/ProfilePage.css';

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
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-image-section">
            {user.profileImage ? (
              <img src={user.profileImage} alt="Profile" className="profile-image" />
            ) : (
              <div className="profile-image-placeholder">
                <span className="placeholder-initial">{user.fullName?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
            )}
          </div>

          <div className="profile-info">
            <h1>{user.fullName || 'User'}</h1>
            <p className="role-badge">{user.designation}</p>
          </div>
        </div>

        {/* Personal Details */}
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Full Name</label>
              <p>{user.fullName || '-'}</p>
            </div>

            <div className="info-item">
              <label>Employee ID</label>
              <p>{user.employeeId || user.id || '-'}</p>
            </div>

            <div className="info-item">
              <label>Email</label>
              <p>
                <a href={`mailto:${user.email}`}>{user.email || '-'}</a>
              </p>
            </div>

            <div className="info-item">
              <label>Phone Number</label>
              <p>
                {user.mobile ? (
                  <a href={`tel:${user.mobile}`}>{user.mobile}</a>
                ) : (
                  '-'
                )}
              </p>
            </div>

            <div className="info-item">
              <label>Role / Designation</label>
              <p>{user.designation || '-'}</p>
            </div>

            <div className="info-item">
              <label>Status</label>
              <p>
                <span className={`status-badge ${user.isApproved ? 'approved' : 'pending'}`}>
                  {user.isApproved ? '✓ Approved' : '⧖ Pending'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Horses Section (if applicable) */}
        {ROLES_WITH_HORSES.includes(user.designation) && (
          <div className="profile-section">
            <h2>Assigned Horses</h2>
            {loading ? (
              <p className="loading">Loading assigned horses...</p>
            ) : assignedHorses.length > 0 ? (
              <div className="horses-grid">
                {assignedHorses.map(horse => (
                  <div key={horse.id} className="horse-card">
                    <div className="horse-header">
                      <h3>🐴 {horse.name}</h3>
                      <span className="horse-role">{horse.role}</span>
                    </div>
                    <div className="horse-details">
                      <p>
                        <strong>Stable #:</strong> {horse.stableNumber}
                      </p>
                      <p>
                        <strong>Breed:</strong> {horse.breed}
                      </p>
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
