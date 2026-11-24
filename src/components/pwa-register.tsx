'use client';

import { useEffect, useRef, useState } from 'react';

export function PwaRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;
    const handleControllerChange = () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting;
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = installing;
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch(() => {
        // Service worker registration may be skipped in some dev setups
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!updateAvailable) return null;

  const handleApplyUpdate = () => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-950 shadow-lg dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
    >
      <span>Доступна новая версия Konuş!</span>
      <button
        type="button"
        onClick={handleApplyUpdate}
        className="rounded-lg bg-sky-600 px-3 py-1.5 font-medium text-white hover:bg-sky-700"
      >
        Обновить приложение
      </button>
    </div>
  );
}
