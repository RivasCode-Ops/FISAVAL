import nodemailer from 'nodemailer';
import { config } from './config.js';

export function isSmtpEnabled(): boolean {
  return !!(
    config.alertaEmailEnabled &&
    config.smtpHost &&
    config.smtpFrom &&
    (config.smtpUser ? config.smtpPass : true)
  );
}

function transport() {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });
}

export async function sendMail(opts: {
  to: string[];
  subject: string;
  text: string;
}): Promise<{ sent: number; failed: number }> {
  if (!isSmtpEnabled()) return { sent: 0, failed: 0 };
  const unique = [...new Set(opts.to.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!unique.length) return { sent: 0, failed: 0 };

  const t = transport();
  let sent = 0;
  let failed = 0;
  for (const to of unique) {
    try {
      await t.sendMail({
        from: config.smtpFrom,
        to,
        subject: opts.subject,
        text: opts.text,
      });
      sent++;
    } catch (err) {
      failed++;
      console.warn(`SMTP falha para ${to}:`, err);
    }
  }
  return { sent, failed };
}
