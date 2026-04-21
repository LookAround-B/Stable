export const EIRS_FORM_WORK_TYPES = [
  'Task',
  'Lesson',
  'Paddock',
  'Walker',
  'Lunging',
  'Roll',
  'Shows',
  'Pony Rides',
  'Horse Rides',
  'Grading',
  'Hack',
  'Leaderships',
  'Lame',
  'Rest',
  'Schooling',
  'Jumping',
] as const;

export const EIRS_LEGACY_WORK_TYPES = [
  'Training',
  'Exercise',
  'Rehab',
  'Groundwork',
  'Flat Work',
  'Hacking',
  'Dressage',
  'Cross Country',
  'Pole Work',
  'Walk',
  'Other',
] as const;

export const EIRS_VALID_WORK_TYPES = [
  ...EIRS_FORM_WORK_TYPES,
  ...EIRS_LEGACY_WORK_TYPES,
] as const;

const EIRS_WORK_TYPE_ALIASES: Record<string, (typeof EIRS_VALID_WORK_TYPES)[number]> = {
  Lunge: 'Lunging',
  Launging: 'Lunging',
  'pony rides': 'Pony Rides',
  'horse rides': 'Horse Rides',
};

const EIRS_NON_RIDER_WORK_TYPES = ['Lunging', 'Rest', 'Lame'] as const;
const EIRS_NON_DURATION_WORK_TYPES = ['Rest', 'Lame'] as const;
const EIRS_NON_BILLABLE_WORK_TYPES = ['Rest', 'Lame'] as const;

export function normalizeEirsWorkType(workType: unknown): string | null {
  if (typeof workType !== 'string') {
    return null;
  }

  const trimmedWorkType = workType.trim();
  if (!trimmedWorkType) {
    return null;
  }

  return EIRS_WORK_TYPE_ALIASES[trimmedWorkType] ?? trimmedWorkType;
}

export function isValidEirsWorkType(workType: unknown): boolean {
  const normalizedWorkType = normalizeEirsWorkType(workType);
  return Boolean(
    normalizedWorkType &&
      EIRS_VALID_WORK_TYPES.includes(normalizedWorkType as (typeof EIRS_VALID_WORK_TYPES)[number])
  );
}

export function workTypeRequiresRider(workType: unknown): boolean {
  const normalizedWorkType = normalizeEirsWorkType(workType);
  return !EIRS_NON_RIDER_WORK_TYPES.includes(
    normalizedWorkType as (typeof EIRS_NON_RIDER_WORK_TYPES)[number]
  );
}

export function isLungingWorkType(workType: unknown): boolean {
  return normalizeEirsWorkType(workType) === 'Lunging';
}

export function workTypeRequiresDuration(workType: unknown): boolean {
  const normalizedWorkType = normalizeEirsWorkType(workType);
  return !EIRS_NON_DURATION_WORK_TYPES.includes(
    normalizedWorkType as (typeof EIRS_NON_DURATION_WORK_TYPES)[number]
  );
}

export function workTypeRequiresNotes(workType: unknown): boolean {
  const normalizedWorkType = normalizeEirsWorkType(workType);
  return normalizedWorkType === 'Rest' || normalizedWorkType === 'Lame';
}

export function isBillableEirsWorkType(workType: unknown): boolean {
  const normalizedWorkType = normalizeEirsWorkType(workType);
  return !EIRS_NON_BILLABLE_WORK_TYPES.includes(
    normalizedWorkType as (typeof EIRS_NON_BILLABLE_WORK_TYPES)[number]
  );
}
