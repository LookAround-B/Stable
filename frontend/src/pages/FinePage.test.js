import fs from 'fs';
import path from 'path';

describe('FinePage audit history actions', () => {
  it('uses icon buttons for evidence, details, resolve, and delete actions', () => {
    const filePath = path.join(__dirname, 'FinePage.js');
    const source = fs.readFileSync(filePath, 'utf8');

    expect(source).toContain("Image as ImageIcon");
    expect(source).toContain("<ImageIcon className=\"w-4 h-4\" />");
    expect(source).toContain("<Eye className=\"w-4 h-4\" />");
    expect(source).toContain("<Check className=\"w-4 h-4\" />");
    expect(source).toContain("<Trash2 className=\"w-4 h-4\" />");
    expect(source).toContain("title={t('Evidence')}");
    expect(source).toContain("title={t('Details')}");
    expect(source).toContain("title={t('Resolve')}");
    expect(source).toContain("title={t('Delete')}");
  });
});
