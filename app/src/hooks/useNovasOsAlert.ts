import { useEffect, useRef } from 'react';

/** Alerta no navegador quando o número de OS do fiscal aumenta (app aberto ou em segundo plano leve). */
export function useNovasOsAlert(count: number, enabled: boolean) {
  const prev = useRef(0);

  useEffect(() => {
    if (!enabled || count <= prev.current) {
      prev.current = count;
      return;
    }
    if (prev.current > 0 && Notification.permission === 'granted') {
      const novas = count - prev.current;
      new Notification('FISAVAL — Nova OS', {
        body: `${novas} nova(s) ordem(ns) de serviço`,
        icon: new URL('./icon.svg', window.location.href).href,
      });
    }
    prev.current = count;
  }, [count, enabled]);
}
