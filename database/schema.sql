-- Stable Management System Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS stable_management;
USE stable_management;

-- Employees table
CREATE TABLE employees (
  id CHAR(36) PRIMARY KEY,
  fullName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phoneNumber VARCHAR(20),
  designation ENUM('Groomer', 'Zamindar', 'Instructor', 'Admin', 'Health Advisor', 'Super Admin') NOT NULL,
  colorCode VARCHAR(7),
  profileImage VARCHAR(512),
  employmentStatus ENUM('Active', 'Inactive', 'On Leave') DEFAULT 'Active',
  shiftTiming VARCHAR(100),
  availability JSON,
  isApproved BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_designation (designation),
  INDEX idx_status (employmentStatus)
);

-- Horses table
CREATE TABLE horses (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  dateOfBirth DATE NOT NULL,
  breed VARCHAR(100),
  color VARCHAR(100),
  height DECIMAL(5, 2),
  location VARCHAR(100),
  profileImage VARCHAR(512),
  
  -- Measurements
  girthSize VARCHAR(50),
  bitSize VARCHAR(50),
  rugSize VARCHAR(50),
  bridleSize VARCHAR(50),
  numnahSize VARCHAR(50),
  
  -- Identification
  ueln VARCHAR(100) UNIQUE,
  microchipNumber VARCHAR(100),
  feiId VARCHAR(100),
  feiExpiry DATE,
  passportDetails TEXT,
  
  -- Pedigree
  sire VARCHAR(255),
  damsire VARCHAR(255),
  
  -- Ownership
  ownerName VARCHAR(255),
  ownerContact VARCHAR(100),
  leaseStatus ENUM('Owned', 'Leased', 'Training') DEFAULT 'Owned',
  emergencyContact VARCHAR(100),
  insuranceDetails TEXT,
  
  -- Status
  status ENUM('Active', 'Rest', 'Injured', 'Traveling') DEFAULT 'Active',
  trainingLevel VARCHAR(100),
  discipline VARCHAR(100),
  workloadLimit ENUM('Light', 'Medium', 'Heavy') DEFAULT 'Medium',
  
  -- Additional
  history TEXT,
  relatedLinks JSON,
  comments TEXT,
  
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_owner (ownerName)
);

-- Horse-Employee assignments
CREATE TABLE horse_employee_assignments (
  id CHAR(36) PRIMARY KEY,
  horseId CHAR(36) NOT NULL,
  groomer_id CHAR(36),
  zamindar_id CHAR(36),
  instructor_id CHAR(36),
  healthAdvisor_id CHAR(36),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (horseId) REFERENCES horses(id) ON DELETE CASCADE,
  FOREIGN KEY (groomer_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (zamindar_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (instructor_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (healthAdvisor_id) REFERENCES employees(id) ON DELETE SET NULL,
  UNIQUE KEY unique_assignment (horseId, groomer_id)
);

-- Tasks table
CREATE TABLE tasks (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('Daily', 'Weekly', 'Event-based') NOT NULL,
  description TEXT,
  horseId CHAR(36) NOT NULL,
  assignedEmployeeId CHAR(36) NOT NULL,
  scheduledTime DATETIME NOT NULL,
  timeWindow JSON,
  priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
  status ENUM('Pending', 'In Progress', 'Completed', 'Missed', 'Approved', 'Rejected') DEFAULT 'Pending',
  requiredProof BOOLEAN DEFAULT FALSE,
  proofImages JSON,
  questionnaire JSON,
  comments TEXT,
  autoExpiryMinutes INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (horseId) REFERENCES horses(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedEmployeeId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_horse (horseId),
  INDEX idx_employee (assignedEmployeeId),
  INDEX idx_scheduled (scheduledTime)
);

-- Approvals table
CREATE TABLE approvals (
  id CHAR(36) PRIMARY KEY,
  taskId CHAR(36) NOT NULL,
  approverId CHAR(36) NOT NULL,
  approverLevel ENUM('Zamindar', 'Instructor', 'Admin') NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'NO_RESPONSE') DEFAULT 'Pending',
  notes TEXT,
  approvedAt DATETIME,
  slaDueDate DATETIME,
  escalatedAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (approverId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_approver (approverId),
  INDEX idx_task (taskId),
  INDEX idx_due_date (slaDueDate)
);

-- Reports table
CREATE TABLE reports (
  id CHAR(36) PRIMARY KEY,
  reporterId CHAR(36) NOT NULL,
  reportedEmployeeId CHAR(36) NOT NULL,
  reason TEXT,
  category VARCHAR(100),
  evidence JSON,
  status ENUM('Open', 'Resolved', 'Dismissed') DEFAULT 'Open',
  resolution TEXT,
  resolvedBy CHAR(36),
  resolvedAt DATETIME,
  taskId CHAR(36),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (reporterId) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (reportedEmployeeId) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (resolvedBy) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_reported (reportedEmployeeId),
  INDEX idx_created (createdAt)
);

-- Health Records table
CREATE TABLE health_records (
  id CHAR(36) PRIMARY KEY,
  horseId CHAR(36) NOT NULL,
  healthAdvisorId CHAR(36),
  recordType ENUM('Vaccination', 'Deworming', 'Injury', 'Vet Visit', 'Farrier Visit', 'Medication') NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  nextDueDate DATE,
  dosage VARCHAR(255),
  administrator VARCHAR(255),
  images JSON,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (horseId) REFERENCES horses(id) ON DELETE CASCADE,
  FOREIGN KEY (healthAdvisorId) REFERENCES employees(id) ON DELETE SET NULL,
  INDEX idx_horse (horseId),
  INDEX idx_type (recordType),
  INDEX idx_date (date),
  INDEX idx_due_date (nextDueDate)
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  userId CHAR(36) NOT NULL,
  action VARCHAR(255) NOT NULL,
  entityType VARCHAR(100) NOT NULL,
  entityId CHAR(36) NOT NULL,
  beforeValue JSON,
  afterValue JSON,
  ipAddress VARCHAR(45),
  userAgent VARCHAR(512),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_user (userId),
  INDEX idx_entity (entityType, entityId),
  INDEX idx_action (action),
  INDEX idx_created (createdAt)
);

-- Notifications table
CREATE TABLE notifications (
  id CHAR(36) PRIMARY KEY,
  recipientId CHAR(36) NOT NULL,
  type ENUM('Task Assignment', 'Task Reminder', 'Missed Task', 'Approval Request', 'Escalation', 'Health Alert', 'Emergency', 'Report') NOT NULL,
  title VARCHAR(255),
  message TEXT,
  relatedEntityId CHAR(36),
  relatedEntityType VARCHAR(100),
  urgency ENUM('Normal', 'Urgent') DEFAULT 'Normal',
  isRead BOOLEAN DEFAULT FALSE,
  readAt DATETIME,
  snoozedUntil DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (recipientId) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_recipient (recipientId),
  INDEX idx_read (isRead),
  INDEX idx_created (createdAt)
);

-- System Settings table
CREATE TABLE system_settings (
  id CHAR(36) PRIMARY KEY,
  settingKey VARCHAR(255) NOT NULL UNIQUE,
  settingValue JSON,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (settingKey)
);

-- Create indexes for better query performance
CREATE INDEX idx_task_status_scheduled ON tasks(status, scheduledTime);
CREATE INDEX idx_approval_task_status ON approvals(taskId, status);
CREATE INDEX idx_horse_status_owner ON horses(status, ownerName);
