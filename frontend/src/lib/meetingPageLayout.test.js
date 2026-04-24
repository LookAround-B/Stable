import { getMeetingPageClassName } from './meetingPageLayout';

describe('getMeetingPageClassName', () => {
  it('includes the meeting-page root class so page-specific alignment rules can apply', () => {
    expect(getMeetingPageClassName()).toBe('meeting-page space-y-6');
  });
});
