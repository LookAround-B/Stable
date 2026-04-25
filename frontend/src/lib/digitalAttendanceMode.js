export const DIGITAL_ATTENDANCE_TEAM_ROLES = [
  'Super Admin',
  'Director',
  'School Administrator',
  'Stable Manager',
  'Ground Supervisor',
];

export const isDigitalAttendanceTeamMode = (designation) =>
  DIGITAL_ATTENDANCE_TEAM_ROLES.includes(designation || '');

export const getDigitalAttendanceHistoryEndpoint = (designation) =>
  isDigitalAttendanceTeamMode(designation) ? '/attendance/team' : '/attendance/personal';

export const buildDigitalAttendanceSubmitRequest = ({ designation, formData }) => {
  if (isDigitalAttendanceTeamMode(designation)) {
    return {
      endpoint: '/attendance/mark-team',
      payload: {
        employeeId: formData.employeeId,
        date: formData.date,
        status: formData.status,
        remarks: formData.remarks,
      },
    };
  }

  return {
    endpoint: '/attendance/digital',
    payload: {
      date: formData.date,
      status: formData.status,
      remarks: formData.remarks,
    },
  };
};
