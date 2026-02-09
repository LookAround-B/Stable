import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();
  const [taskStats, setTaskStats] = useState({
    pending: 0,
    completed: 0,
    total: 0
  });

  useEffect(() => {
    loadTaskStats();
  }, []);

  const loadTaskStats = async () => {
    try {
      const response = await apiClient.get('/tasks');
      const tasks = response.data.data || [];
      
      const pending = tasks.filter(t => t.status === 'Pending').length;
      const completed = tasks.filter(t => t.status === 'Completed').length;
      
      setTaskStats({
        pending,
        completed,
        total: tasks.length
      });
    } catch (error) {
      console.error('Error loading task stats:', error);
    }
  };

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

      case 'Jamedar':
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>Assigned Tasks</h2>
              <p className="metric">{taskStats.total}</p>
            </div>
            <div className="card">
              <h2>Pending Tasks</h2>
              <p className="metric">{taskStats.pending}</p>
            </div>
            <div className="card">
              <h2>Completed Tasks</h2>
              <p className="metric">{taskStats.completed}</p>
            </div>
            <div className="card">
              <h2>Task Completion Rate</h2>
              <p className="score">{taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%</p>
            </div>
          </div>
        );

      case 'Groomer':
      default:
        return (
          <div className="dashboard-grid">
            <div className="card">
              <h2>My Daily Tasks</h2>
              <p className="metric">{taskStats.total}</p>
            </div>
            <div className="card">
              <h2>Pending Tasks</h2>
              <p className="metric">{taskStats.pending}</p>
            </div>
            <div className="card">
              <h2>Completed Tasks</h2>
              <p className="metric">{taskStats.completed}</p>
            </div>
            <div className="card">
              <h2>Task Completion Rate</h2>
              <p className="score">{taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%</p>
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
