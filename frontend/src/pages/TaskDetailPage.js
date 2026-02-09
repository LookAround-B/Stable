import React from 'react';
import { useParams } from 'react-router-dom';
import '../styles/TaskDetailPage.css';

const TaskDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="task-detail-page">
      <h1>Task Details</h1>
      <p>Loading task details for ID: {id}</p>
    </div>
  );
};

export default TaskDetailPage;
