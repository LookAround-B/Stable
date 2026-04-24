const padDateTimePart = (value) => String(value).padStart(2, '0');

export const formatMedicineLogDateTimeInputValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    padDateTimePart(date.getMonth() + 1),
    padDateTimePart(date.getDate()),
  ].join('-') + `T${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}`;
};

export const getInitialMedicineLogFormData = (value = new Date()) => ({
  horseId: '',
  medicineName: '',
  diagnosis: '',
  quantity: '',
  unit: 'ml',
  timeAdministered: formatMedicineLogDateTimeInputValue(value),
  notes: '',
  photoUrl: '',
});

export const getMedicineLogFormDataFromLog = (log) => ({
  horseId: log?.horseId || '',
  medicineName: log?.medicineName || '',
  diagnosis: log?.diagnosis || '',
  quantity: log?.quantity === 0 || log?.quantity ? String(log.quantity) : '',
  unit: log?.unit || 'ml',
  timeAdministered: formatMedicineLogDateTimeInputValue(log?.timeAdministered),
  notes: log?.notes || '',
  photoUrl: log?.photoUrl || '',
});
