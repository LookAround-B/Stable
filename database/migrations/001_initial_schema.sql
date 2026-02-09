-- PostgreSQL Schema for Stable Management System
-- Run this migration after setting up Prisma: npx prisma migrate deploy

CREATE TABLE "Employee" (
  id TEXT NOT NULL PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "phoneNumber" TEXT,
  designation TEXT NOT NULL,
  "colorCode" TEXT,
  "profileImage" TEXT,
  "shiftTiming" TEXT,
  "employmentStatus" TEXT NOT NULL DEFAULT 'Active',
  "isApproved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Horse" (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  gender TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3) NOT NULL,
  breed TEXT,
  color TEXT,
  height DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'Active',
  "ownerName" TEXT,
  "profileImage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Task" (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  "horseId" TEXT NOT NULL,
  "assignedEmployeeId" TEXT NOT NULL,
  "scheduledTime" TIMESTAMP(3) NOT NULL,
  "completedTime" TIMESTAMP(3),
  priority TEXT NOT NULL DEFAULT 'Medium',
  "requiredProof" BOOLEAN NOT NULL DEFAULT false,
  "proofImage" TEXT,
  description TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("horseId") REFERENCES "Horse"(id) ON DELETE CASCADE,
  FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"(id) ON DELETE RESTRICT
);

CREATE TABLE "Approval" (
  id TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "approverId" TEXT NOT NULL,
  "approverLevel" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  comments TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("taskId") REFERENCES "Task"(id) ON DELETE CASCADE,
  FOREIGN KEY ("approverId") REFERENCES "Employee"(id) ON DELETE RESTRICT,
  UNIQUE("taskId", "approverId")
);

CREATE TABLE "Report" (
  id TEXT NOT NULL PRIMARY KEY,
  "reportedEmployeeId" TEXT NOT NULL,
  "reporterEmployeeId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT,
  "taskId" TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("reportedEmployeeId") REFERENCES "Employee"(id) ON DELETE CASCADE,
  FOREIGN KEY ("reporterEmployeeId") REFERENCES "Employee"(id) ON DELETE CASCADE
);

CREATE TABLE "HealthRecord" (
  id TEXT NOT NULL PRIMARY KEY,
  "horseId" TEXT NOT NULL,
  "healthAdvisorId" TEXT,
  "recordType" TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP(3) NOT NULL,
  "nextDueDate" TIMESTAMP(3),
  documents TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("horseId") REFERENCES "Horse"(id) ON DELETE CASCADE,
  FOREIGN KEY ("healthAdvisorId") REFERENCES "Employee"(id) ON DELETE SET NULL
);

CREATE TABLE "Notification" (
  id TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "relatedTaskId" TEXT,
  "relatedApprovalId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE
);

CREATE TABLE "AuditLog" (
  id TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  changes TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "Employee"(id) ON DELETE CASCADE
);

CREATE TABLE "SystemSettings" (
  id TEXT NOT NULL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create Indexes
CREATE INDEX "Employee_designation_idx" ON "Employee"("designation");
CREATE INDEX "Employee_email_idx" ON "Employee"("email");
CREATE INDEX "Horse_status_idx" ON "Horse"("status");
CREATE INDEX "Horse_name_idx" ON "Horse"("name");
CREATE INDEX "Task_horseId_idx" ON "Task"("horseId");
CREATE INDEX "Task_assignedEmployeeId_idx" ON "Task"("assignedEmployeeId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_scheduledTime_idx" ON "Task"("scheduledTime");
CREATE INDEX "Approval_taskId_idx" ON "Approval"("taskId");
CREATE INDEX "Approval_approverId_idx" ON "Approval"("approverId");
CREATE INDEX "Report_reportedEmployeeId_idx" ON "Report"("reportedEmployeeId");
CREATE INDEX "Report_reporterEmployeeId_idx" ON "Report"("reporterEmployeeId");
CREATE INDEX "HealthRecord_horseId_idx" ON "HealthRecord"("horseId");
CREATE INDEX "HealthRecord_healthAdvisorId_idx" ON "HealthRecord"("healthAdvisorId");
CREATE INDEX "HealthRecord_date_idx" ON "HealthRecord"("date");
CREATE INDEX "Notification_employeeId_idx" ON "Notification"("employeeId");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
