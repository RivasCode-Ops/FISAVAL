import { useCallback, useEffect, useState } from 'react';
import { pingApiHealth, type ApiHealth } from '@/api/health';
import { isApiMode } from '@/api/config';

export function useApiHealth(pollMs = 0) {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (!isApiMode()) {
      setHealth(null);
      return;
    }
    setChecking(true);
    setHealth(await pingApiHealth());
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
    if (!pollMs || !isApiMode()) return;
    const id = window.setInterval(() => void check(), pollMs);
    return () => clearInterval(id);
  }, [check, pollMs]);

  return { health, checking, check };
}
