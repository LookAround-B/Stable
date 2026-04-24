import { formatLocalDateInputValue } from './localDateInput';

describe('formatLocalDateInputValue', () => {
  it('returns a yyyy-mm-dd string for a selected calendar date', () => {
    expect(formatLocalDateInputValue(new Date(2026, 3, 22))).toBe('2026-04-22');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatLocalDateInputValue('not-a-date')).toBe('');
  });
});
