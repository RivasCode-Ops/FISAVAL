import { runPrazoPushCycle } from './prazoPush.js';
import { runPrazoEmailCycle } from './prazoEmail.js';
import { isPushEnabled } from './push.js';
import { isSmtpEnabled } from './smtp.js';
import { config } from './config.js';

/** Ciclo unificado: push + e-mail (cada canal com throttle próprio). */
export async function runPrazoAlertCycle(force = false): Promise<void> {
  if (isPushEnabled() && config.alertaPushEnabled) {
    await runPrazoPushCycle(force);
  }
  if (isSmtpEnabled()) {
    await runPrazoEmailCycle(force);
  }
}
