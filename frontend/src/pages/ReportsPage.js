import React from 'react';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';
import usePermissions from '../hooks/usePermissions';

const ReportsPage = () => {
  const { t } = useI18n();
  const p = usePermissions();
  if (!p.viewReports) return <Navigate to="/" replace />;
  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>{t('Reports')}</h1>
        <p>{t('View and generate system reports')}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <h3>{t('Attendance Reports')}</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>{t('View daily and team attendance summaries.')}</p>
        </div>
        <div className="card">
          <h3>{t('Task Reports')}</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>{t('View task completion and assignment statistics.')}</p>
        </div>
        <div className="card">
          <h3>{t('Expense Reports')}</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>{t('View expense summaries and breakdowns.')}</p>
        </div>
        <div className="card">
          <h3>{t('Horse Health Reports')}</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '.875rem' }}>{t('View inspection rounds and medicine logs.')}</p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
