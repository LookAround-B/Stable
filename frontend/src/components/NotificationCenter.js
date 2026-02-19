import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/NotificationCenter.css';

const NotificationCenter = () => {
  const { user } = useAuth();
  const [pendingTasks, setPendingTasks] = useState([]);
  const [meetingNotifications, setMeetingNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // tasks or meetings

  useEffect(() => {
    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadNotifications = async () => {
    // Only show notifications for parent roles
    const parentRoles = ['Director', 'School Administrator', 'Stable Manager'];
    if (!parentRoles.includes(user?.designation)) {
      return;
    }

    try {
      setLoading(true);
      // Load pending tasks
      const tasksResponse = await apiClient.get('/tasks', {
        params: { status: 'Pending Review' }
      });
      setPendingTasks(tasksResponse.data.data || []);

      // Load meetings where user is a participant (newly added within last 24 hours)
      const meetingsResponse = await apiClient.get('/meetings', {
        params: { filterType: 'all' }
      });
      
      if (meetingsResponse.data.data) {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Filter meetings where current user is a participant and meeting was created recently
        const recentMeetings = meetingsResponse.data.data.filter(meeting => {
          const meetingCreatedAt = new Date(meeting.createdAt);
          return (
            meetingCreatedAt > oneDayAgo &&
            meeting.participants.some(p => p.employeeId === user.id)
          );
        });
        setMeetingNotifications(recentMeetings);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only show for parent roles
  const parentRoles = ['Director', 'School Administrator', 'Stable Manager'];
  if (!parentRoles.includes(user?.designation)) {
    return null;
  }

  const taskCount = pendingTasks.length;
  const meetingCount = meetingNotifications.length;
  const totalCount = taskCount + meetingCount;

  return (
    <div className="notification-center">
      <div className="notification-icon" onClick={() => setShowNotifications(!showNotifications)}>
        {totalCount > 0 && (
          <span className="badge">{totalCount > 9 ? '9+' : totalCount}</span>
        )}
        🔔
      </div>

      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>📬 Notifications</h3>
            <span className="close-btn" onClick={() => setShowNotifications(false)}>✕</span>
          </div>

          {/* Tab buttons */}
          <div className="notification-tabs">
            <button
              className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              ✓ Tasks ({taskCount})
            </button>
            <button
              className={`tab-btn ${activeTab === 'meetings' ? 'active' : ''}`}
              onClick={() => setActiveTab('meetings')}
            >
              📅 Meetings ({meetingCount})
            </button>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-item empty">Loading...</div>
            ) : activeTab === 'tasks' ? (
              taskCount === 0 ? (
                <div className="notification-item empty">✓ No pending tasks</div>
              ) : (
                pendingTasks.map((task) => (
                  <div key={task.id} className="notification-item task-notification">
                    <div className="notification-content">
                      <p className="notification-message">
                        <strong>{task.createdBy?.fullName}</strong> assigned <strong>"{task.name}"</strong> to <strong>{task.assignedEmployee?.fullName}</strong>
                      </p>
                      <p className="notification-horse">🐴 {task.horse?.name}</p>
                      <p className="notification-time">
                        {new Date(task.scheduledTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : meetingCount === 0 ? (
              <div className="notification-item empty">✓ No new meetings</div>
            ) : (
              meetingNotifications.map((meeting) => (
                <div key={meeting.id} className="notification-item meeting-notification">
                  <div className="notification-content">
                    <p className="notification-message">
                      <strong>{meeting.createdBy?.fullName}</strong> added you to meeting <strong>"{meeting.title}"</strong>
                    </p>
                    <p className="notification-time">
                      📅 {new Date(meeting.meetingDate).toLocaleDateString('en-IN')} at {meeting.meetingTime || 'TBD'}
                    </p>
                    <p className="notification-location">
                      📍 {meeting.location || 'Location TBD'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
