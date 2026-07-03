import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { hydrateDexieFromApi } from '@/api/client';
import { isApiMode } from '@/api/config';
import { ensureSeed } from '@/db/seed';
import { migrateLocalDbOnLoad, resetLocalIndexedDb } from '@/db/migrateOnLoad';
import '@/styles/app.css';

async function bootstrap() {
  const resetDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).has('resetDemo');
  if (resetDemo) {
    await resetLocalIndexedDb();
    window.history.replaceState({}, '', window.location.pathname);
    await ensureSeed();
    await migrateLocalDbOnLoad();
    return;
  }

  const { token } = await import('@/store/authStore').then((m) => m.useAuthStore.getState());
  if (isApiMode() && navigator.onLine && token) {
    try {
      await hydrateDexieFromApi();
      await migrateLocalDbOnLoad();
      return;
    } catch {
      /* seed local */
    }
  }
  await ensureSeed();
  await migrateLocalDbOnLoad();
}

void bootstrap().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
