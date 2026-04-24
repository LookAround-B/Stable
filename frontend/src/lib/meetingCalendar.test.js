import { getMeetingDateKey, getMeetingsForDate } from './meetingCalendar';

describe('meetingCalendar', () => {
  it('builds a local date key', () => {
    expect(getMeetingDateKey(new Date(2026, 3, 22, 18, 30))).toBe('2026-04-22');
  });

  it('filters meetings for the selected calendar day', () => {
    const meetings = [
      { id: 'a', meetingDate: '2026-04-22T12:00:00.000Z' },
      { id: 'b', meetingDate: '2026-04-22T15:00:00.000Z' },
      { id: 'c', meetingDate: '2026-04-23T12:00:00.000Z' },
    ];

    expect(getMeetingsForDate(meetings, new Date(2026, 3, 22))).toEqual([
      meetings[0],
      meetings[1],
    ]);
  });

  it('returns an empty list for an invalid selection', () => {
    expect(
      getMeetingsForDate(
        [{ id: 'a', meetingDate: '2026-04-22T12:00:00.000Z' }],
        null
      )
    ).toEqual([]);
  });
});
