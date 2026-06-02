import { getApiUrl } from '@/api/config';
import { getStoredTenantId } from '@/api/tenantStorage';
import { useAuthStore } from '@/store/authStore';

export type PushScope = 'nova_os' | 'prazo_vencido';

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

async function registerSubscription(
  path: string,
  body: { subscription: PushSubscriptionJSON; scopes?: PushScope[] },
): Promise<boolean> {
  const token = useAuthStore.getState().token;
  const base = getApiUrl();
  const tid = getStoredTenantId();
  const res = await fetch(`${base}/api/fisaval${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tid ? { 'X-Tenant-Id': tid } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeWebPush(
  scopes: PushScope[] = ['nova_os'],
  mode: 'tenant' | 'super' = 'tenant',
): Promise<'ok' | 'unsupported' | 'denied' | 'no-vapid' | 'error'> {
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
    const json = sub.toJSON() as PushSubscriptionJSON;
    const path = mode === 'super' ? '/push/subscribe/super' : '/push/subscribe';
    const ok = await registerSubscription(path, {
      subscription: json,
      scopes: mode === 'super' ? ['prazo_vencido'] : scopes,
    });
    return ok ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
