import React from 'react';
import '../styles/ReportsPage.css';

const ReportsPage = () => {
  return (
    <div className="reports-page">
      <h1>Reports</h1>
      <button className="btn-add">Create New Report</button>
      <div className="reports-list">
        <p>No reports found</p>
      </div>
    </div>
  );
};

export default ReportsPage;
