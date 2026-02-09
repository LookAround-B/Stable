const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Horse = sequelize.define('Horse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female'),
    allowNull: false,
  },
  dateOfBirth: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  breed: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  height: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Measurements
  girthSize: DataTypes.STRING,
  bitSize: DataTypes.STRING,
  rugSize: DataTypes.STRING,
  bridleSize: DataTypes.STRING,
  numnahSize: DataTypes.STRING,

  // Identification
  ueln: DataTypes.STRING,
  microchipNumber: DataTypes.STRING,
  feiId: DataTypes.STRING,
  feiExpiry: DataTypes.DATE,
  passportDetails: DataTypes.TEXT,

  // Pedigree
  sire: DataTypes.STRING,
  damsire: DataTypes.STRING,

  // Ownership
  ownerName: DataTypes.STRING,
  ownerContact: DataTypes.STRING,
  leaseStatus: {
    type: DataTypes.ENUM('Owned', 'Leased', 'Training'),
    defaultValue: 'Owned',
  },
  emergencyContact: DataTypes.STRING,
  insuranceDetails: DataTypes.TEXT,

  // Status
  status: {
    type: DataTypes.ENUM('Active', 'Rest', 'Injured', 'Traveling'),
    defaultValue: 'Active',
  },
  trainingLevel: DataTypes.STRING,
  discipline: DataTypes.STRING,
  workloadLimit: {
    type: DataTypes.ENUM('Light', 'Medium', 'Heavy'),
    defaultValue: 'Medium',
  },

  // Additional
  history: DataTypes.TEXT,
  relatedLinks: DataTypes.JSON,
  comments: DataTypes.TEXT,

  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'horses',
  timestamps: true,
});

module.exports = Horse;
