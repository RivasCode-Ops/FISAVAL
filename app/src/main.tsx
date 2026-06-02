import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { hydrateDexieFromApi } from '@/api/client';
import { isApiMode } from '@/api/config';
import { ensureSeed } from '@/db/seed';
import '@/styles/app.css';

async function bootstrap() {
  if (isApiMode() && navigator.onLine) {
    try {
      await hydrateDexieFromApi();
      return;
    } catch {
      /* seed local */
    }
  }
  await ensureSeed();
}

void bootstrap().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
