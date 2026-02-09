// Type definitions for the API

export interface CreateEmployeeInput {
  fullName: string
  email: string
  phoneNumber?: string
  designation: 'Groomer' | 'Zamindar' | 'Instructor' | 'Admin' | 'Health Advisor' | 'Super Admin'
  colorCode?: string
  shiftTiming?: string
}

export interface CreateHorseInput {
  name: string
  gender: 'Male' | 'Female'
  dateOfBirth: string
  breed?: string
  color?: string
  height?: number
  status?: 'Active' | 'Rest' | 'Injured' | 'Traveling'
  ownerName?: string
}

export interface CreateTaskInput {
  name: string
  type: 'Daily' | 'Weekly' | 'Event-based'
  horseId: string
  assignedEmployeeId: string
  scheduledTime: string
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent'
  requiredProof?: boolean
  description?: string
}

export interface CreateApprovalInput {
  taskId: string
  approverId: string
  approverLevel: 'Zamindar' | 'Instructor' | 'Admin'
}

export interface CreateReportInput {
  reportedEmployeeId: string
  reason: string
  category?: string
  taskId?: string
}

export interface CreateHealthRecordInput {
  horseId: string
  healthAdvisorId?: string
  recordType: 'Vaccination' | 'Deworming' | 'Injury' | 'Vet Visit' | 'Farrier Visit' | 'Medication'
  description?: string
  date: string
  nextDueDate?: string
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  status: number
}
