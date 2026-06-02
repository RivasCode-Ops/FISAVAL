import { getApiUrl } from '@/api/config';
import { useAuthStore } from '@/store/authStore';

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  const base = getApiUrl();
  if (!base) return null;
  const res = await fetch(`${base}/api/fisaval/push/vapid-key`);
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey: string };
  return data.publicKey;
}

export async function subscribeWebPush(): Promise<'ok' | 'unsupported' | 'denied' | 'no-vapid' | 'error'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return 'no-vapid';

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const token = useAuthStore.getState().token;
    const base = getApiUrl();
    const res = await fetch(`${base}/api/fisaval/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    return res.ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
