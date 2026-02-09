const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  recipientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Task Assignment', 'Task Reminder', 'Missed Task', 'Approval Request', 'Escalation', 'Health Alert', 'Emergency', 'Report'),
    allowNull: false,
  },
  title: DataTypes.STRING,
  message: DataTypes.TEXT,
  relatedEntityId: DataTypes.UUID,
  relatedEntityType: DataTypes.STRING,
  urgency: {
    type: DataTypes.ENUM('Normal', 'Urgent'),
    defaultValue: 'Normal',
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: DataTypes.DATE,
  snoozedUntil: DataTypes.DATE,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
