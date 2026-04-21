const taskEmployeeSelect = {
  id: true,
  fullName: true,
  email: true,
  designation: true,
  profileImage: true,
  isApproved: true,
} as const

const taskHorseSelect = {
  id: true,
  name: true,
  profileImage: true,
  stableNumber: true,
} as const

const taskApprovalSelect = {
  id: true,
  approverId: true,
  approverLevel: true,
  status: true,
  comments: true,
  createdAt: true,
  updatedAt: true,
  approver: {
    select: taskEmployeeSelect,
  },
} as const

export const taskListSelect = {
  id: true,
  name: true,
  type: true,
  status: true,
  horseId: true,
  instructorId: true,
  assignedEmployeeId: true,
  createdById: true,
  scheduledTime: true,
  completedTime: true,
  submittedAt: true,
  priority: true,
  requiredProof: true,
  proofImage: true,
  completionNotes: true,
  customerName: true,
  customerPhone: true,
  paymentSource: true,
  leadPrice: true,
  isMembershipBooking: true,
  packageName: true,
  packageRideCount: true,
  packageMemberCount: true,
  packagePrice: true,
  gstAmount: true,
  bookingCategory: true,
  bookingRideType: true,
  bookingDestination: true,
  bookingSlot: true,
  accommodationCheckIn: true,
  accommodationCheckOut: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  horse: {
    select: taskHorseSelect,
  },
  instructor: {
    select: taskEmployeeSelect,
  },
  assignedEmployee: {
    select: taskEmployeeSelect,
  },
  createdBy: {
    select: taskEmployeeSelect,
  },
} as const

export const taskDetailSelect = {
  ...taskListSelect,
  approvals: {
    select: taskApprovalSelect,
  },
} as const
