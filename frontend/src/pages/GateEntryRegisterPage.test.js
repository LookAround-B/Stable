import fs from 'fs';
import path from 'path';

describe('GateEntryRegisterPage theme classes', () => {
  it('uses themed modal and input surface classes for the record gate entry form', () => {
    const filePath = path.join(__dirname, 'GateEntryRegisterPage.js');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('bg-surface-container-highest');
    expect(source).toContain('bg-surface-container-high border border-border');
    expect(source).not.toContain('my-auto bg-white');
    expect(source).not.toContain('bg-gray-100 border border-gray-200');
  });
});
