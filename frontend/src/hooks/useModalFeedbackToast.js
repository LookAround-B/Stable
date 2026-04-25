import { useEffect, useRef } from 'react';
import { toast } from '../components/ui/sonner';

const SUCCESS_PATTERNS = [
  /\bsuccess\b/i,
  /\bcreated\b/i,
  /\bupdated\b/i,
  /\brecorded\b/i,
  /\bsubmitted\b/i,
  /\buploaded\b/i,
  /\bsaved\b/i,
  /\bdeleted\b/i,
  /\bapproved\b/i,
];

const ERROR_PATTERNS = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bplease\b/i,
  /\brequired\b/i,
  /\bselect\b/i,
  /\binvalid\b/i,
  /\bmissing\b/i,
  /\bcannot\b/i,
  /\bmust\b/i,
];

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

export const getModalFeedbackTone = ({ type = '', message = '', error = '' }) => {
  const explicitType = normalizeText(type).toLowerCase();
  const feedbackText = normalizeText(error || message);

  if (!feedbackText) return null;
  if (explicitType === 'error') return 'error';
  if (explicitType === 'warning' || explicitType === 'warn') return 'warning';
  if (explicitType === 'success') return 'success';
  if (normalizeText(error)) return 'error';
  if (SUCCESS_PATTERNS.some((pattern) => pattern.test(feedbackText))) return 'success';
  if (ERROR_PATTERNS.some((pattern) => pattern.test(feedbackText))) return 'warning';
  return 'warning';
};

export const getModalFeedbackToast = ({ open, type = '', message = '', error = '' }) => {
  if (!open) return null;

  const tone = getModalFeedbackTone({ type, message, error });
  const text = normalizeText(error || message);

  if (!text || !tone || tone === 'success') return null;

  return { text, tone };
};

export const shouldSuppressInlineModalFeedback = ({ open, type = '', message = '', error = '' }) => {
  const feedback = getModalFeedbackToast({ open, type, message, error });
  return Boolean(feedback);
};

const fireToast = (tone, text, toastId) => {
  const options = { id: toastId, duration: 4500 };

  if (tone === 'error') {
    toast.error(text, options);
    return;
  }

  if (typeof toast.warning === 'function') {
    toast.warning(text, options);
    return;
  }

  toast(text, options);
};

const useModalFeedbackToast = ({ open, type = '', message = '', error = '' }) => {
  const lastToastRef = useRef('');

  useEffect(() => {
    if (!open) {
      lastToastRef.current = '';
      return;
    }

    const feedback = getModalFeedbackToast({ open, type, message, error });

    if (!feedback) return;

    const toastId = `${feedback.tone}:${feedback.text}`;
    if (lastToastRef.current === toastId) return;

    lastToastRef.current = toastId;
    fireToast(feedback.tone, feedback.text, toastId);
  }, [open, type, message, error]);
};

export default useModalFeedbackToast;
