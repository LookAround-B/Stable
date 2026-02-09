const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  designation: {
    type: DataTypes.ENUM('Groomer', 'Zamindar', 'Instructor', 'Admin', 'Health Advisor', 'Super Admin'),
    allowNull: false,
  },
  colorCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  employmentStatus: {
    type: DataTypes.ENUM('Active', 'Inactive', 'On Leave'),
    defaultValue: 'Active',
  },
  shiftTiming: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  availability: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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
  tableName: 'employees',
  timestamps: true,
});

module.exports = Employee;
