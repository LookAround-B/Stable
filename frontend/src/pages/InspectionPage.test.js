import fs from 'fs';
import path from 'path';

describe('InspectionPage success flow', () => {
  it('closes the modal after a successful inspection submit and keeps the count label tight', () => {
    const source = fs.readFileSync(path.join(__dirname, 'InspectionPage.js'), 'utf8');

    expect(source).toContain("closeForm(); await loadInspections();");
    expect(source).toContain('`Inspections (${inspections.length})`');
  });
});
