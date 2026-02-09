const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Daily', 'Weekly', 'Event-based'),
    allowNull: false,
  },
  description: DataTypes.TEXT,
  horseId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assignedEmployeeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  scheduledTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  timeWindow: {
    type: DataTypes.JSON, // { start: "06:30", end: "07:00" }
    allowNull: true,
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Urgent'),
    defaultValue: 'Medium',
  },
  status: {
    type: DataTypes.ENUM('Pending', 'In Progress', 'Completed', 'Missed', 'Approved', 'Rejected'),
    defaultValue: 'Pending',
  },
  requiredProof: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  proofImages: {
    type: DataTypes.JSON, // Array of image URLs
    allowNull: true,
  },
  questionnaire: {
    type: DataTypes.JSON, // Array of questions and answers
    allowNull: true,
  },
  comments: DataTypes.TEXT,
  autoExpiryMinutes: DataTypes.INTEGER,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'tasks',
  timestamps: true,
});

module.exports = Task;
