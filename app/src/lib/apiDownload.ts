import { getApiUrl } from '@/api/config';
import { useAuthStore } from '@/store/authStore';

export async function downloadAuthenticatedCsv(path: string, filename: string): Promise<boolean> {
  const base = getApiUrl();
  const token = useAuthStore.getState().token;
  if (!base || !token) return false;
  const res = await fetch(`${base}/api/fisaval${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
