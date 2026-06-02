export function getApiUrl(): string | undefined {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (!url) return undefined;
  return url.replace(/\/$/, '');
}

export function isApiMode(): boolean {
  return !!getApiUrl();
}
