import React from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../context/I18nContext';

const TaskDetailPage = () => {
  const { id } = useParams();
  const { t } = useI18n();

  return (
    <div className="task-detail-page">
      <h1>{t('Task Details')}</h1>
      <p>Loading task details for ID: {id}</p>
    </div>
  );
};

export default TaskDetailPage;
