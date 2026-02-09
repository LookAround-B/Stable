import React from 'react';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <div className="settings-sections">
        <div className="settings-section">
          <h2>Task Configuration</h2>
          <p>Configure task templates and schedules</p>
        </div>
        <div className="settings-section">
          <h2>Approval Configuration</h2>
          <p>Set SLA times and escalation rules</p>
        </div>
        <div className="settings-section">
          <h2>Working Hours</h2>
          <p>Configure facility hours and shifts</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
