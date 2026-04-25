import fs from 'fs';
import path from 'path';

describe('DigitalAttendancePage supervisor mode', () => {
  it('uses the shared team-mode helper and a searchable employee picker for digital attendance', () => {
    const filePath = path.join(__dirname, 'DigitalAttendancePage.js');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('isDigitalAttendanceTeamMode');
    expect(source).toContain('getDigitalAttendanceHistoryEndpoint');
    expect(source).toContain('buildDigitalAttendanceSubmitRequest');
    expect(source).toContain('<SearchableSelect');
    expect(source).toContain("name=\"employeeId\"");
    expect(source).toContain('/attendance/team-members');
  });
});
