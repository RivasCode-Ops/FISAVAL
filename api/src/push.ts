import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import webpush from 'web-push';
import { config } from './config.js';

export type PushSubscriptionRow = {
  fiscalId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
};

const subsPath = () => join(config.dataDir, 'push-subs.json');

function loadSubs(): PushSubscriptionRow[] {
  const p = subsPath();
  if (!existsSync(p)) return [];
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as PushSubscriptionRow[];
  } catch {
    return [];
  }
}

function saveSubs(rows: PushSubscriptionRow[]) {
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(subsPath(), JSON.stringify(rows, null, 2), 'utf8');
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

export async function savePushSubscription(
  fiscalId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  const rows = loadSubs().filter((r) => r.endpoint !== sub.endpoint);
  rows.push({
    fiscalId,
    endpoint: sub.endpoint,
    keys: sub.keys,
    createdAt: new Date().toISOString(),
  });
  saveSubs(rows);
}

export async function removePushSubscription(endpoint: string) {
  saveSubs(loadSubs().filter((r) => r.endpoint !== endpoint));
}

export async function notifyNewOs(fiscalId: string, osId: string, endereco: string) {
  if (!ensureVapid()) return;
  const subs = loadSubs().filter((s) => s.fiscalId === fiscalId);
  const payload = JSON.stringify({
    title: 'FISAVAL — Nova OS',
    body: `${osId}: ${endereco}`,
    url: '/campo',
  });
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: s.keys },
        payload,
      ),
    ),
  );
}
