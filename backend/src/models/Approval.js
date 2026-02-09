const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Approval = sequelize.define('Approval', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  taskId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  approverId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  approverLevel: {
    type: DataTypes.ENUM('Zamindar', 'Instructor', 'Admin'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'NO_RESPONSE'),
    defaultValue: 'Pending',
  },
  notes: DataTypes.TEXT,
  approvedAt: DataTypes.DATE,
  slaDueDate: DataTypes.DATE,
  escalatedAt: DataTypes.DATE,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'approvals',
  timestamps: true,
});

module.exports = Approval;
