const KEY = 'fisaval-tenant-id';

export function getStoredTenantId(): string {
  try {
    return localStorage.getItem(KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function setStoredTenantId(id: string) {
  try {
    localStorage.setItem(KEY, id.trim());
  } catch {
    /* ignore */
  }
}
