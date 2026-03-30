export const THEME_STORAGE_KEY = 'efm.ui.theme';
export const THEME_CHANGE_EVENT = 'efm-theme-changed';

export const isValidTheme = (value) => value === 'light' || value === 'dark';

export const getStoredTheme = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isValidTheme(saved)) {
    return saved;
  }

  if (
    document.documentElement.getAttribute('data-efm-theme') === 'light' ||
    document.documentElement.classList.contains('light')
  ) {
    return 'light';
  }

  return 'dark';
};

export const applyTheme = (theme) => {
  const nextTheme = isValidTheme(theme) ? theme : 'dark';

  if (typeof window === 'undefined') {
    return nextTheme;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  document.documentElement.setAttribute('data-efm-theme', nextTheme);
  document.documentElement.classList.toggle('light', nextTheme === 'light');
  document.body.classList.toggle('light', nextTheme === 'light');
  document.body.classList.toggle('efm-theme-light', nextTheme === 'light');

  const themeColor = nextTheme === 'light' ? '#f6f7fb' : '#09090b';
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', themeColor);
  }

  return nextTheme;
};

export const setAppTheme = (theme, options = {}) => {
  const nextTheme = applyTheme(theme);

  if (options.notify !== false && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: nextTheme } }));
  }

  return nextTheme;
};

export const subscribeToThemeChange = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleThemeChange = (event) => {
    const nextTheme = event?.detail?.theme;
    if (isValidTheme(nextTheme)) {
      callback(nextTheme);
    }
  };

  const handleStorageChange = (event) => {
    if (event.key && event.key !== THEME_STORAGE_KEY) {
      return;
    }

    const nextTheme = event.newValue || getStoredTheme();
    if (isValidTheme(nextTheme)) {
      callback(nextTheme);
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.removeEventListener('storage', handleStorageChange);
  };
};
