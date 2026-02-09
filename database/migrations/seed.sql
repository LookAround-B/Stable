-- Seed data for initial development
-- Run after migrations: psql -d stable_management -f seed.sql

-- Insert sample employees
INSERT INTO "Employee" (id, "fullName", email, designation, "employmentStatus", "isApproved", "createdAt", "updatedAt")
VALUES
  ('emp_001', 'Admin User', 'admin@stable.local', 'Super Admin', 'Active', true, NOW(), NOW()),
  ('emp_002', 'John Groomer', 'john.groomer@stable.local', 'Groomer', 'Active', true, NOW(), NOW()),
  ('emp_003', 'Sarah Instructor', 'sarah@stable.local', 'Instructor', 'Active', true, NOW(), NOW()),
  ('emp_004', 'Mike Zamindar', 'mike@stable.local', 'Zamindar', 'Active', true, NOW(), NOW()),
  ('emp_005', 'Dr. Health Advisor', 'health@stable.local', 'Health Advisor', 'Active', true, NOW(), NOW());

-- Insert sample horses
INSERT INTO "Horse" (id, name, gender, "dateOfBirth", breed, color, status, "createdAt", "updatedAt")
VALUES
  ('horse_001', 'Thunder', 'Male', '2018-05-15', 'Thoroughbred', 'Bay', 'Active', NOW(), NOW()),
  ('horse_002', 'Luna', 'Female', '2019-03-22', 'Arabian', 'Gray', 'Active', NOW(), NOW()),
  ('horse_003', 'Spirit', 'Male', '2017-11-08', 'Warmblood', 'Chestnut', 'Active', NOW(), NOW());

-- Insert sample tasks
INSERT INTO "Task" (id, name, type, status, "horseId", "assignedEmployeeId", "scheduledTime", priority, "createdAt", "updatedAt")
VALUES
  ('task_001', 'Morning Grooming - Thunder', 'Daily', 'Pending', 'horse_001', 'emp_002', NOW() + INTERVAL '1 hour', 'High', NOW(), NOW()),
  ('task_002', 'Feeding - Luna', 'Daily', 'Pending', 'horse_002', 'emp_002', NOW() + INTERVAL '2 hours', 'High', NOW(), NOW()),
  ('task_003', 'Health Check - Spirit', 'Weekly', 'Pending', 'horse_003', 'emp_005', NOW() + INTERVAL '1 day', 'Medium', NOW(), NOW());

-- Insert sample system settings
INSERT INTO "SystemSettings" (id, key, value, description, "updatedAt")
VALUES
  ('setting_001', 'app_name', 'Stable Management System', 'Application name', NOW()),
  ('setting_002', 'max_daily_tasks', '50', 'Maximum daily tasks per employee', NOW()),
  ('setting_003', 'approval_required_for_reports', 'true', 'Whether approval is required for reports', NOW());
