const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

export const prepareInspectionImagesForSubmission = async (
  images = [],
  uploadFile
) => {
  const submittedImages = [];

  for (const image of images) {
    if (!image) continue;

    if (typeof File !== 'undefined' && image instanceof File) {
      submittedImages.push(await uploadFile(image));
      continue;
    }

    if (isNonEmptyString(image)) {
      submittedImages.push(image);
    }
  }

  return submittedImages;
};
