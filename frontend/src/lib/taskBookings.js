export const BOOKING_TASK_TYPE = 'Riding Booking';
export const ACCOMMODATION_TASK_TYPE = 'Accommodation Booking';

export const BOOKING_CATEGORY_OPTIONS = [
  { value: 'Normal Riding', label: 'Normal Riding' },
  { value: 'Fun Rides', label: 'Fun Rides' },
];

export const FUN_RIDE_OPTIONS = [
  { value: 'Pony Ride', label: 'Pony Ride' },
  { value: 'Hack', label: 'Hack' },
];

export const BOOKING_DESTINATION_OPTIONS = [
  { value: 'Inside', label: 'Inside' },
  { value: 'Outside', label: 'Outside' },
];

export const BOOKING_SLOT_OPTIONS = [
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

export const PAYMENT_SOURCE_OPTIONS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Card', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Other', label: 'Other' },
];

const SLOT_LABELS = {
  '6': '6 AM',
  '7': '7 AM',
  '8': '8 AM',
  '9': '9 AM',
  '10': '10 AM',
  '3': '3 PM',
  '4': '4 PM',
  '5': '5 PM',
};

const SLOT_TIMES = {
  '6': '06:00',
  '7': '07:00',
  '8': '08:00',
  '9': '09:00',
  '10': '10:00',
  '3': '15:00',
  '4': '16:00',
  '5': '17:00',
};

const getTaskType = (taskOrType) =>
  typeof taskOrType === 'string' ? taskOrType : taskOrType?.type;

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const isRideBookingTask = (taskOrType) => getTaskType(taskOrType) === BOOKING_TASK_TYPE;

export const isAccommodationBookingTask = (taskOrType) =>
  getTaskType(taskOrType) === ACCOMMODATION_TASK_TYPE;

export const isTaskBooking = (taskOrType) =>
  isRideBookingTask(taskOrType) || isAccommodationBookingTask(taskOrType);

export const isBookingTask = isTaskBooking;

export const getBookingSlotLabel = (slot) => SLOT_LABELS[slot] || (slot ? `Slot ${slot}` : 'No slot');

export const getBookingSlotTime = (slot) => SLOT_TIMES[slot] || null;

export const getBookingRideTypeLabel = (task) => {
  if (!task) return '';
  if (task.bookingCategory === 'Normal Riding') return 'Instructor Book';
  return task.bookingRideType || '';
};

export const getAccommodationScheduleLabel = (task) => {
  if (!isAccommodationBookingTask(task)) return '';

  const checkInLabel = formatDateTime(task.accommodationCheckIn);
  const checkOutLabel = formatDateTime(task.accommodationCheckOut);

  if (checkInLabel && checkOutLabel) {
    return `Check-in ${checkInLabel} | Check-out ${checkOutLabel}`;
  }

  return checkInLabel || checkOutLabel || '';
};

export const getBookingSummary = (task) => {
  if (!isTaskBooking(task)) return '';

  if (isAccommodationBookingTask(task)) {
    return [
      task.customerName ? `Guest: ${task.customerName}` : '',
      task.customerPhone ? `Phone: ${task.customerPhone}` : '',
      getAccommodationScheduleLabel(task),
      task.leadPrice != null ? `Lead Price: ${task.leadPrice}` : 'Lead Price: null',
      task.paymentSource ? `Payment: ${task.paymentSource}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }

  return [
    task.bookingCategory,
    getBookingRideTypeLabel(task),
    task.bookingDestination ? `Where: ${task.bookingDestination}` : '',
    task.instructor?.fullName ? `Instructor: ${task.instructor.fullName}` : '',
    task.customerName ? `Client: ${task.customerName}` : '',
    task.bookingSlot ? `Slot ${getBookingSlotLabel(task.bookingSlot)}` : '',
    task.leadPrice != null ? `Lead Price: ${task.leadPrice}` : 'Lead Price: null',
    task.paymentSource ? `Payment: ${task.paymentSource}` : '',
    task.isMembershipBooking && task.packageName ? `Package: ${task.packageName}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
};
