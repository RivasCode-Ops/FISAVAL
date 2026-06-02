import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import webpush from 'web-push';
import { config } from './config.js';
import { tenantDataDir, tenantPushSubsPath } from './tenantPaths.js';

export type PushScope = 'nova_os' | 'prazo_vencido';

export type PushSubscriptionRow = {
  userId: string;
  role: 'fiscal' | 'gestor' | 'admin';
  scopes: PushScope[];
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
};

const subsPath = () => tenantPushSubsPath();
const superSubsPath = () => join(config.dataDir, 'super-push-subs.json');

function normalizeRow(raw: Record<string, unknown>): PushSubscriptionRow {
  if (raw.userId && raw.role) {
    return {
      userId: String(raw.userId),
      role: raw.role as PushSubscriptionRow['role'],
      scopes: (raw.scopes as PushScope[]) ?? ['nova_os'],
      endpoint: String(raw.endpoint),
      keys: raw.keys as PushSubscriptionRow['keys'],
      createdAt: String(raw.createdAt ?? new Date().toISOString()),
    };
  }
  return {
    userId: String(raw.fiscalId ?? raw.userId),
    role: 'fiscal',
    scopes: ['nova_os'],
    endpoint: String(raw.endpoint),
    keys: raw.keys as PushSubscriptionRow['keys'],
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function loadSubsFile(path: string): PushSubscriptionRow[] {
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>[];
    return raw.map((r) => normalizeRow(r));
  } catch {
    return [];
  }
}

function saveSubsFile(path: string, rows: PushSubscriptionRow[]) {
  const dir = path === superSubsPath() ? config.dataDir : tenantDataDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(rows, null, 2), 'utf8');
}

function loadSubs(): PushSubscriptionRow[] {
  return loadSubsFile(subsPath());
}

function loadSuperSubs(): PushSubscriptionRow[] {
  return loadSubsFile(superSubsPath());
}

export function isPushEnabled() {
  return !!(config.vapidPublic && config.vapidPrivate);
}

export function getVapidPublicKey() {
  return config.vapidPublic;
}

function ensureVapid() {
  if (!isPushEnabled()) return false;
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublic, config.vapidPrivate);
  return true;
}

async function sendPayload(subs: PushSubscriptionRow[], payload: object) {
  if (!ensureVapid() || !subs.length) return;
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body),
    ),
  );
  const dead: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const status = (r.reason as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) dead.push(subs[i].endpoint);
    }
  });
  return dead;
}

export async function savePushSubscription(
  userId: string,
  role: PushSubscriptionRow['role'],
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  scopes: PushScope[],
) {
  const rows = loadSubs().filter((r) => r.endpoint !== sub.endpoint);
  rows.push({
    userId,
    role,
    scopes: scopes.length ? scopes : role === 'fiscal' ? ['nova_os'] : ['prazo_vencido'],
    endpoint: sub.endpoint,
    keys: sub.keys,
    createdAt: new Date().toISOString(),
  });
  saveSubsFile(subsPath(), rows);
}

export async function saveSuperPushSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  const rows = loadSuperSubs().filter((r) => r.endpoint !== sub.endpoint);
  rows.push({
    userId,
    role: 'admin',
    scopes: ['prazo_vencido'],
    endpoint: sub.endpoint,
    keys: sub.keys,
    createdAt: new Date().toISOString(),
  });
  saveSubsFile(superSubsPath(), rows);
}

export async function removePushSubscription(endpoint: string) {
  saveSubsFile(subsPath(), loadSubs().filter((r) => r.endpoint !== endpoint));
  saveSubsFile(superSubsPath(), loadSuperSubs().filter((r) => r.endpoint !== endpoint));
}

function subsForGestorPrazo(): PushSubscriptionRow[] {
  return loadSubs().filter(
    (s) => (s.role === 'gestor' || s.role === 'admin') && s.scopes.includes('prazo_vencido'),
  );
}

export async function notifyNewOs(fiscalId: string, osId: string, endereco: string) {
  const subs = loadSubs().filter(
    (s) => s.userId === fiscalId && s.role === 'fiscal' && s.scopes.includes('nova_os'),
  );
  const dead = await sendPayload(subs, {
    title: 'FISAVAL — Nova OS',
    body: `${osId}: ${endereco}`,
    url: '/campo',
  });
  if (dead?.length) saveSubsFile(subsPath(), loadSubs().filter((r) => !dead.includes(r.endpoint)));
}

export async function notifyPrazoVencidoGestores(count: number, osId?: string, endereco?: string) {
  const subs = subsForGestorPrazo();
  const amostra = osId ? `${osId}${endereco ? `: ${endereco}` : ''}` : '';
  const dead = await sendPayload(subs, {
    title: 'FISAVAL — Prazo vencido',
    body:
      count === 1
        ? `1 OS ativa com prazo vencido${amostra ? ` (${amostra})` : ''}`
        : `${count} OS ativas com prazo vencido`,
    url: '/painel',
  });
  if (dead?.length) saveSubsFile(subsPath(), loadSubs().filter((r) => !dead.includes(r.endpoint)));
}

export async function notifySuperAdminPrazoVencido(
  total: number,
  tenantsEmAlerta: number,
  resumo: string,
) {
  const subs = loadSuperSubs();
  const dead = await sendPayload(subs, {
    title: 'FISAVAL — Alerta global',
    body: `${total} OS vencida(s) em ${tenantsEmAlerta} prefeitura(s). ${resumo}`,
    url: '/super',
  });
  if (dead?.length) {
    saveSubsFile(superSubsPath(), loadSuperSubs().filter((r) => !dead.includes(r.endpoint)));
  }
}
