const padDatePart = (value) => String(value).padStart(2, '0');

export const getMeetingDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
};

export const getMeetingsForDate = (meetings, date) => {
  const dateKey = getMeetingDateKey(date);

  if (!dateKey) {
    return [];
  }

  return meetings.filter(
    (meeting) => String(meeting?.meetingDate || '').split('T')[0] === dateKey
  );
};
