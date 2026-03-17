import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for PWA install prompt.
 * - Android/Chrome: captures beforeinstallprompt and triggers native dialog
 * - iOS Safari: detects platform and shows custom instruction modal
 * - Tracks dismissed state in localStorage so it doesn't nag
 */
const STORAGE_KEY = 'efm-pwa-install-dismissed';

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export default function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isInStandaloneMode());
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => setIsInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else if (isIos()) {
      setShowIosModal(true);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowIosModal(false);
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }, []);

  const canInstall = !isInstalled && !dismissed && (!!deferredPrompt || isIos());

  return { canInstall, isInstalled, install, showIosModal, dismiss, isIos: isIos() };
}
