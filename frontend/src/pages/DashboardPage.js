import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();

  const renderRoleSpecificContent = () => {
    const role = user?.designation;

    switch (role) {
      case 'Super Admin':
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>System Overview</h2>
              <p className="description">Full system access and control</p>
            </div>
            <div className="card">
              <h2>Total Horses</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Total Employees</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Pending Tasks</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>System Settings</h2>
              <p className="description">Configure system parameters</p>
            </div>
            <div className="card">
              <h2>Audit Logs</h2>
              <p className="metric">0</p>
            </div>
          </div>
        );

      case 'Admin':
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>Stable Readiness Score</h2>
              <p className="score">85%</p>
            </div>
            <div className="card">
              <h2>Total Horses</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Total Employees</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Pending Reports</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Approvals Pending</h2>
              <p className="metric">0</p>
            </div>
          </div>
        );

      case 'Zamindar':
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>My Tasks</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Pending Approvals</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Active Horses</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Team Members</h2>
              <p className="metric">0</p>
            </div>
          </div>
        );

      case 'Instructor':
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>My Training Tasks</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Horses in Training</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Completed This Week</h2>
              <p className="metric">0</p>
            </div>
          </div>
        );

      case 'Health Advisor':
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>Health Records</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Vaccinations Due</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Medical Alerts</h2>
              <p className="metric">0</p>
            </div>
          </div>
        );

      case 'Groomer':
      default:
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>My Daily Tasks</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Completed Today</h2>
              <p className="metric">0</p>
            </div>
            <div className="card">
              <h2>Assigned Horses</h2>
              <p className="metric">0</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-page">
      <h1>Hello {user?.fullName} ({user?.designation})</h1>
      {renderRoleSpecificContent()}
    </div>
  );
};

export default DashboardPage;
