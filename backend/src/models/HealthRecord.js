const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HealthRecord = sequelize.define('HealthRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  horseId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  healthAdvisorId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  recordType: {
    type: DataTypes.ENUM('Vaccination', 'Deworming', 'Injury', 'Vet Visit', 'Farrier Visit', 'Medication'),
    allowNull: false,
  },
  description: DataTypes.TEXT,
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  nextDueDate: DataTypes.DATE,
  dosage: DataTypes.STRING,
  administrator: DataTypes.STRING,
  images: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  notes: DataTypes.TEXT,
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'health_records',
  timestamps: true,
});

module.exports = HealthRecord;
