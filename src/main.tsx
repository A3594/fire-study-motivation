import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js', { updateViaCache: 'none' })
      .then((registration) => {
        bindAutoUpdate(registration);
        requestUpdate(registration);
      })
      .catch(() => {
        // The app still works in a browser when service workers are unavailable.
      });
  });
}

function bindAutoUpdate(registration: ServiceWorkerRegistration) {
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });

  window.addEventListener('focus', () => requestUpdate(registration));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestUpdate(registration);
  });
  window.setInterval(() => requestUpdate(registration), 30 * 60 * 1000);
}

function requestUpdate(registration: ServiceWorkerRegistration) {
  registration.update().catch(() => {
    // Updates are opportunistic; the current version remains usable offline.
  });
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}
