import {
  buildDigitalAttendanceSubmitRequest,
  getDigitalAttendanceHistoryEndpoint,
  isDigitalAttendanceTeamMode,
} from './digitalAttendanceMode';

describe('digitalAttendanceMode', () => {
  it('treats supervisor roles as team-attendance mode', () => {
    expect(isDigitalAttendanceTeamMode('Stable Manager')).toBe(true);
    expect(isDigitalAttendanceTeamMode('Ground Supervisor')).toBe(true);
    expect(isDigitalAttendanceTeamMode('Director')).toBe(true);
    expect(isDigitalAttendanceTeamMode('Groom')).toBe(false);
  });

  it('uses team attendance history for supervisor roles', () => {
    expect(getDigitalAttendanceHistoryEndpoint('Super Admin')).toBe('/attendance/team');
    expect(getDigitalAttendanceHistoryEndpoint('Rider')).toBe('/attendance/personal');
  });

  it('builds a team-attendance submit payload with employeeId for supervisor roles', () => {
    expect(
      buildDigitalAttendanceSubmitRequest({
        designation: 'Stable Manager',
        formData: {
          employeeId: 'emp-1',
          date: '2026-04-25',
          status: 'Present',
          remarks: 'On time',
        },
      })
    ).toEqual({
      endpoint: '/attendance/mark-team',
      payload: {
        employeeId: 'emp-1',
        date: '2026-04-25',
        status: 'Present',
        remarks: 'On time',
      },
    });
  });
});
