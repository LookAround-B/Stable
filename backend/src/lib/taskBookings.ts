export const BOOKING_TASK_TYPE = 'Work Record' as const
export const ACCOMMODATION_TASK_TYPE = 'Accommodation Booking' as const

export const TASK_BOOKING_TYPES = [
  BOOKING_TASK_TYPE,
  ACCOMMODATION_TASK_TYPE,
] as const

export const BOOKING_CATEGORY_OPTIONS = [
  'Normal Riding',
  'Casual Rides',
  'Fun Rides',
] as const

export const BOOKING_RIDE_TYPE_OPTIONS = [
  'Normal Riding',
  'Casual Rides',
  'Pony Ride',
  'Hack',
] as const

export const FUN_RIDE_TYPE_OPTIONS = ['Pony Ride', 'Hack'] as const
export const BOOKING_DESTINATION_OPTIONS = ['Inside', 'Outside'] as const

export const BOOKING_SLOT_OPTIONS = ['6', '7', '8', '9', '10', '3', '4', '5'] as const

export const PAYMENT_SOURCE_OPTIONS = [
  'Cash',
  'Card',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Other',
] as const

const BOOKING_SLOT_TIME_MAP: Record<(typeof BOOKING_SLOT_OPTIONS)[number], string> = {
  '6': '06:00',
  '7': '07:00',
  '8': '08:00',
  '9': '09:00',
  '10': '10:00',
  '3': '15:00',
  '4': '16:00',
  '5': '17:00',
}

const BOOKING_SLOT_LABEL_MAP: Record<(typeof BOOKING_SLOT_OPTIONS)[number], string> = {
  '6': '6 AM',
  '7': '7 AM',
  '8': '8 AM',
  '9': '9 AM',
  '10': '10 AM',
  '3': '3 PM',
  '4': '4 PM',
  '5': '5 PM',
}

export function isBookingTaskType(taskType: unknown): boolean {
  return taskType === BOOKING_TASK_TYPE
}

export function isAccommodationTaskType(taskType: unknown): boolean {
  return taskType === ACCOMMODATION_TASK_TYPE
}

export function isTaskBookingType(taskType: unknown): boolean {
  return TASK_BOOKING_TYPES.includes(taskType as (typeof TASK_BOOKING_TYPES)[number])
}

export function isValidBookingCategory(category: unknown): boolean {
  return BOOKING_CATEGORY_OPTIONS.includes(
    category as (typeof BOOKING_CATEGORY_OPTIONS)[number]
  )
}

export function isValidBookingRideType(rideType: unknown): boolean {
  return BOOKING_RIDE_TYPE_OPTIONS.includes(
    rideType as (typeof BOOKING_RIDE_TYPE_OPTIONS)[number]
  )
}

export function isValidBookingSlot(slot: unknown): boolean {
  return BOOKING_SLOT_OPTIONS.includes(slot as (typeof BOOKING_SLOT_OPTIONS)[number])
}

export function isValidBookingDestination(destination: unknown): boolean {
  return BOOKING_DESTINATION_OPTIONS.includes(
    destination as (typeof BOOKING_DESTINATION_OPTIONS)[number]
  )
}

export function isValidPaymentSource(source: unknown): boolean {
  return PAYMENT_SOURCE_OPTIONS.includes(
    source as (typeof PAYMENT_SOURCE_OPTIONS)[number]
  )
}

export function resolveBookingRideType(
  bookingCategory: string,
  bookingRideType?: string | null
): (typeof BOOKING_RIDE_TYPE_OPTIONS)[number] | null {
  if (bookingCategory === 'Normal Riding') {
    return 'Normal Riding'
  }

  if (bookingCategory === 'Casual Rides') {
    return 'Casual Rides'
  }

  if (
    bookingCategory === 'Fun Rides' &&
    FUN_RIDE_TYPE_OPTIONS.includes(
      bookingRideType as (typeof FUN_RIDE_TYPE_OPTIONS)[number]
    )
  ) {
    return bookingRideType as (typeof BOOKING_RIDE_TYPE_OPTIONS)[number]
  }

  return null
}

export function getBookingSlotTime(slot: string): string | null {
  return BOOKING_SLOT_TIME_MAP[slot as keyof typeof BOOKING_SLOT_TIME_MAP] ?? null
}

export function formatBookingSlot(slot: string | null | undefined): string {
  if (!slot) return 'No slot'
  return BOOKING_SLOT_LABEL_MAP[slot as keyof typeof BOOKING_SLOT_LABEL_MAP] ?? `Slot ${slot}`
}

export function buildBookingTaskName(params: {
  bookingRideType: string
  horseName: string
  bookingSlot: string
  bookingDestination?: string | null
}) {
  const destinationSuffix = params.bookingDestination
    ? ` - ${params.bookingDestination}`
    : ''
  return `${params.bookingRideType} - ${params.horseName} - ${formatBookingSlot(
    params.bookingSlot
  )}${destinationSuffix}`
}

export function buildBookingNotificationMessage(params: {
  action: 'created' | 'updated' | 'cancelled'
  horseName: string
  instructorName?: string | null
  bookingCategory: string
  bookingRideType: string
  bookingSlot: string
  bookingDestination?: string | null
  scheduledDate: Date
}) {
  const dateLabel = params.scheduledDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
  const slotLabel = formatBookingSlot(params.bookingSlot)

  const destinationLabel = params.bookingDestination
    ? ` (${params.bookingDestination})`
    : ''
  const instructorLabel = params.instructorName
    ? ` with ${params.instructorName}`
    : ''
  const bookingSummary = `${params.bookingRideType}${destinationLabel} for ${params.horseName}${instructorLabel} on ${dateLabel} at ${slotLabel}`

  if (params.action === 'created') {
    return `A ${params.bookingCategory.toLowerCase()} booking was created: ${bookingSummary}.`
  }

  if (params.action === 'cancelled') {
    return `This booking was cancelled: ${bookingSummary}.`
  }

  return `This booking was updated: ${bookingSummary}.`
}

export function buildAccommodationTaskName(params: {
  customerName: string
  checkIn: Date
}) {
  const dateLabel = params.checkIn.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
  return `Accommodation - ${params.customerName} - ${dateLabel}`
}

export function buildAccommodationNotificationMessage(params: {
  action: 'created' | 'updated' | 'cancelled'
  customerName: string
  customerPhone: string
  paymentSource: string
  checkIn: Date
  checkOut: Date
}) {
  const rangeLabel = `${params.checkIn.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })} to ${params.checkOut.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })}`
  const summary = `${params.customerName} (${params.customerPhone}) staying ${rangeLabel}. Payment: ${params.paymentSource}.`

  if (params.action === 'created') {
    return `A new accommodation booking was created: ${summary}`
  }

  if (params.action === 'cancelled') {
    return `This accommodation booking was cancelled: ${summary}`
  }

  return `This accommodation booking was updated: ${summary}`
}
