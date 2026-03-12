import { useState, useEffect, useCallback } from 'react';

const TEXT_SIZE_KEY = 'efm-text-size';
const VALID_SIZES = ['small', 'medium', 'large'];

/**
 * Hook to manage text-size preference.
 * Persists to localStorage and applies data-text-size attribute on <html>.
 * Scaling is only activated by CSS for screens ≤ 768px.
 */
const useTextSize = () => {
  const [textSize, setTextSizeState] = useState(() => {
    try {
      const stored = localStorage.getItem(TEXT_SIZE_KEY);
      return VALID_SIZES.includes(stored) ? stored : 'medium';
    } catch {
      return 'medium';
    }
  });

  // Apply attribute on mount and when value changes
  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
  }, [textSize]);

  const setTextSize = useCallback((size) => {
    if (!VALID_SIZES.includes(size)) return;
    setTextSizeState(size);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, size);
    } catch { /* quota exceeded — ignore */ }
    document.documentElement.setAttribute('data-text-size', size);
  }, []);

  return { textSize, setTextSize };
};

export default useTextSize;
