import {
  getModalFeedbackToast,
  shouldSuppressInlineModalFeedback,
} from './useModalFeedbackToast';

describe('useModalFeedbackToast helpers', () => {
  it('returns an error toast payload for modal error state', () => {
    expect(
      getModalFeedbackToast({
        open: true,
        error: 'Please fill in all required fields',
      })
    ).toEqual({
      text: 'Please fill in all required fields',
      tone: 'error',
    });
  });

  it('returns a warning toast payload for modal warning messages', () => {
    expect(
      getModalFeedbackToast({
        open: true,
        message: 'Please select a staff member and add at least one task entry',
      })
    ).toEqual({
      text: 'Please select a staff member and add at least one task entry',
      tone: 'warning',
    });
  });

  it('does not emit modal toast payloads for success messages', () => {
    expect(
      getModalFeedbackToast({
        open: true,
        message: 'Work record created successfully',
        type: 'success',
      })
    ).toBeNull();
  });

  it('suppresses inline page feedback only for modal warnings and errors', () => {
    expect(
      shouldSuppressInlineModalFeedback({
        open: true,
        message: 'Please add at least one entry',
      })
    ).toBe(true);

    expect(
      shouldSuppressInlineModalFeedback({
        open: true,
        message: 'Worksheet created successfully',
        type: 'success',
      })
    ).toBe(false);
  });
});
