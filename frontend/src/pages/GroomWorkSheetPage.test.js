import fs from 'fs';
import path from 'path';

describe('GroomWorkSheetPage worksheet modal styling', () => {
  it('keeps the horse entry canvas white while inputs remain grey', () => {
    const filePath = path.join(__dirname, 'GroomWorkSheetPage.js');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain('const inputCls = "w-full h-10 px-3 rounded-lg bg-gray-100 border border-gray-200');
    expect(source).toContain('className="bg-white rounded-lg p-4 border border-gray-200 space-y-3"');
    expect(source).not.toContain('className="bg-gray-100 rounded-lg p-4 border border-gray-200 space-y-3"');
  });
});
