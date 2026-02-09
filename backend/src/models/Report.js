const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reporterId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reportedEmployeeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  reason: DataTypes.TEXT,
  category: DataTypes.STRING, // Predefined categories
  evidence: {
    type: DataTypes.JSON, // Array of image URLs
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Open', 'Resolved', 'Dismissed'),
    defaultValue: 'Open',
  },
  resolution: DataTypes.TEXT,
  resolvedBy: DataTypes.UUID,
  resolvedAt: DataTypes.DATE,
  taskId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'reports',
  timestamps: true,
});

module.exports = Report;
