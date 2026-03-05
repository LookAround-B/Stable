import React from 'react';

const ReportsPage = () => {
  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reports</h1>
        <p>View and generate system reports</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <h3>Attendance Reports</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>View daily and team attendance summaries.</p>
        </div>
        <div className="card">
          <h3>Task Reports</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>View task completion and assignment statistics.</p>
        </div>
        <div className="card">
          <h3>Expense Reports</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>View expense summaries and breakdowns.</p>
        </div>
        <div className="card">
          <h3>Horse Health Reports</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>View inspection rounds and medicine logs.</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
