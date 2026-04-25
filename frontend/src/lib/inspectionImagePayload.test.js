import { prepareInspectionImagesForSubmission } from './inspectionImagePayload';

describe('prepareInspectionImagesForSubmission', () => {
  it('uploads File images and preserves existing URLs in order', async () => {
    const firstFile = new File(['first'], 'first.png', { type: 'image/png' });
    const existingUrl = 'https://cdn.example.com/inspection.png';
    const secondFile = new File(['second'], 'second.png', { type: 'image/png' });
    const uploadFile = jest
      .fn()
      .mockResolvedValueOnce('https://cdn.example.com/uploaded-1.png')
      .mockResolvedValueOnce('https://cdn.example.com/uploaded-2.png');

    const result = await prepareInspectionImagesForSubmission(
      [firstFile, existingUrl, secondFile],
      uploadFile
    );

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(uploadFile).toHaveBeenNthCalledWith(1, firstFile);
    expect(uploadFile).toHaveBeenNthCalledWith(2, secondFile);
    expect(result).toEqual([
      'https://cdn.example.com/uploaded-1.png',
      existingUrl,
      'https://cdn.example.com/uploaded-2.png',
    ]);
  });

  it('filters out unsupported empty values', async () => {
    const uploadFile = jest.fn();

    const result = await prepareInspectionImagesForSubmission(
      ['', null, undefined, 'https://cdn.example.com/existing.png'],
      uploadFile
    );

    expect(uploadFile).not.toHaveBeenCalled();
    expect(result).toEqual(['https://cdn.example.com/existing.png']);
  });
});
