import React from 'react';
import '../styles/TaskCard.css';

const TaskCard = ({ task, onTaskClick, onStartTask, onCompleteTask }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
      case 'Approved':
        return 'status-completed';
      case 'In Progress':
        return 'status-in-progress';
      case 'Rejected':
        return 'status-rejected';
      case 'Missed':
        return 'status-missed';
      default:
        return 'status-pending';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'priority-urgent';
      case 'High':
        return 'priority-high';
      case 'Medium':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  };

  return (
    <div className="task-card">
      <div className="task-header">
        <h3 className="task-name">{task.name}</h3>
        <span className={`task-status ${getStatusColor(task.status)}`}>
          {task.status}
        </span>
      </div>

      <div className="task-body">
        <div className="task-info">
          <p className="task-horse">
            <strong>Horse:</strong> {task.horseName || 'Unknown'}
          </p>
          <p className="task-time">
            <strong>Scheduled:</strong>{' '}
            {new Date(task.scheduledTime).toLocaleString()}
          </p>
          <span className={`task-priority ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
      </div>

      <div className="task-footer">
        <button
          className="btn-small btn-view"
          onClick={() => onTaskClick(task.id)}
        >
          View Details
        </button>

        {task.status === 'Pending' && (
          <button
            className="btn-small btn-start"
            onClick={() => onStartTask(task.id)}
          >
            Start Task
          </button>
        )}

        {task.status === 'In Progress' && (
          <button
            className="btn-small btn-complete"
            onClick={() => onCompleteTask(task.id)}
          >
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
