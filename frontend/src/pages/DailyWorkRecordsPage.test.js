import fs from 'fs';
import path from 'path';

describe('DailyWorkRecordsPage copy', () => {
  it('uses Add Entry wording for the create action', () => {
    const source = fs.readFileSync(path.join(__dirname, 'DailyWorkRecordsPage.js'), 'utf8');

    expect(source).toContain('Add Entry');
  });
});
