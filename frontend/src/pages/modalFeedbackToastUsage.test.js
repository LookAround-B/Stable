import fs from 'fs';
import path from 'path';

const PAGE_FILES = [
  'WorkRecordPage.js',
  'DailyWorkRecordsPage.js',
  'DigitalAttendancePage.js',
  'TeamAttendancePage.js',
  'GateEntryRegisterPage.js',
  'GroomWorkSheetPage.js',
  'FeedInventoryPage.js',
  'HorseFeedsPage.js',
  'HousekeepingInventoryPage.js',
  'TackInventoryPage.js',
  'FarrierInventoryPage.js',
  'GrassBeddingPage.js',
  'HorseCareTeamPage.js',
  'MedicineInventoryPage.js',
  'MedicineLogsPage.js',
];

describe('modal feedback pages', () => {
  it.each(PAGE_FILES)('%s uses the shared modal feedback toast hook', (fileName) => {
    const source = fs.readFileSync(path.join(__dirname, fileName), 'utf8');

    expect(source).toContain('useModalFeedbackToast');
  });
});
