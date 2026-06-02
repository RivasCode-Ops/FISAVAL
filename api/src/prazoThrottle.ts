import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

type ThrottleState = { lastAt: string; lastCount: number };

export function loadThrottleState(path: string): ThrottleState | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ThrottleState;
  } catch {
    return null;
  }
}

export function saveThrottleState(path: string, count: number) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify({ lastAt: new Date().toISOString(), lastCount: count }, null, 2),
    'utf8',
  );
}

export function isPrazoNotifyThrottled(path: string, count: number, force: boolean): boolean {
  if (force) return false;
  const prev = loadThrottleState(path);
  if (!prev?.lastAt) return false;
  const elapsed = Date.now() - new Date(prev.lastAt).getTime();
  if (elapsed < config.alertaPushIntervalHours * 3_600_000) return true;
  if (prev.lastCount === count && count > 0) return true;
  return false;
}
