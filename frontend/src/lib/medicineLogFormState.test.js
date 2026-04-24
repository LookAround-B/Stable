import {
  formatMedicineLogDateTimeInputValue,
  getInitialMedicineLogFormData,
  getMedicineLogFormDataFromLog,
} from './medicineLogFormState';

describe('medicineLogFormState', () => {
  const formatExpectedLocalDateTime = (value) => {
    const date = new Date(value);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-') + `T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  it('formats a datetime-local value in local time', () => {
    expect(
      formatMedicineLogDateTimeInputValue(new Date(2026, 3, 22, 14, 5))
    ).toBe('2026-04-22T14:05');
  });

  it('builds the initial blank form state', () => {
    expect(
      getInitialMedicineLogFormData(new Date(2026, 3, 22, 14, 5))
    ).toEqual({
      horseId: '',
      medicineName: '',
      diagnosis: '',
      quantity: '',
      unit: 'ml',
      timeAdministered: '2026-04-22T14:05',
      notes: '',
      photoUrl: '',
    });
  });

  it('maps an existing log into editable form values', () => {
    expect(
      getMedicineLogFormDataFromLog({
        horseId: 'horse-1',
        medicineName: 'Phenylbutazone',
        diagnosis: 'Lameness',
        quantity: 12.5,
        unit: 'ml',
        timeAdministered: '2026-04-22T09:45:00.000Z',
        notes: 'After training',
        photoUrl: 'https://example.com/photo.jpg',
      })
    ).toEqual({
      horseId: 'horse-1',
      medicineName: 'Phenylbutazone',
      diagnosis: 'Lameness',
      quantity: '12.5',
      unit: 'ml',
      timeAdministered: formatExpectedLocalDateTime('2026-04-22T09:45:00.000Z'),
      notes: 'After training',
      photoUrl: 'https://example.com/photo.jpg',
    });
  });
});
