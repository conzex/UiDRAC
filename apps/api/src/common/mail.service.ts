/** Outbound mail — password reset is always sent to the account email on file (never a caller-supplied address). */
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { publicAppUrl } from './edge-agent.config';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  private transporter(overrides?: { host: string; port: number; secure: boolean; user?: string; pass?: string }) {
    const host = overrides?.host ?? process.env.SMTP_HOST;
    if (!host) return null;
    const port = overrides?.port ?? parseInt(process.env.SMTP_PORT ?? '587', 10);
    const secure = overrides?.secure ?? (process.env.SMTP_SECURE === 'true' || port === 465);
    const user = overrides?.user ?? process.env.SMTP_USER;
    const pass = overrides?.pass ?? process.env.SMTP_PASS;
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /** Account must have a deliverable email (not a bare sign-in ID like `admin`). */
  assertDeliverableAccountEmail(accountEmail: string): string {
    const to = accountEmail.trim();
    if (!to) {
      throw new BadRequestException('This account has no email address on file.');
    }
    if (!to.includes('@') || to.startsWith('@') || !to.includes('.')) {
      throw new BadRequestException(
        `Password reset is email-only. This account sign-in ID "${to}" is not a deliverable email — update the user profile with a real email first.`,
      );
    }
    return to;
  }

  /** Deliver password reset material only to `accountEmail` from the user record. */
  async sendPasswordResetToAccountEmail(accountEmail: string, temporaryPassword: string): Promise<void> {
    const to = this.assertDeliverableAccountEmail(accountEmail);

    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@uidrac.cloud.conzex.com';
    const appUrl = publicAppUrl();
    const subject = 'Universal iDRAC Console — password reset';
    const text = [
      'A password reset was requested for your Universal iDRAC Console account.',
      '',
      `Sign-in URL: ${appUrl}/login`,
      `Temporary password (change after sign-in): ${temporaryPassword}`,
      '',
      'If you did not request this reset, contact your administrator immediately.',
    ].join('\n');

    const transport = this.transporter();
    if (!transport) {
      throw new ServiceUnavailableException(
        'Email delivery is not configured (set SMTP_HOST, SMTP_PORT, and related variables). Password was not changed.',
      );
    }

    try {
      await transport.sendMail({ from, to, subject, text });
      this.log.log(`Password reset email sent to account on file (${to}).`);
    } catch (err) {
      this.log.error(`SMTP send failed for ${to}`, err instanceof Error ? err.stack : String(err));
      throw new ServiceUnavailableException('Could not send password reset email. Try again or check SMTP settings.');
    }
  }

  /** Verify SMTP credentials and optionally send a test email. Returns true on success. */
  async testSmtp(config: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
    testRecipient?: string;
  }): Promise<{ success: boolean; message: string }> {
    const transport = this.transporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      pass: config.pass,
    });

    if (!transport) {
      return { success: false, message: 'SMTP host is required.' };
    }

    try {
      await transport.verify();
    } catch (err) {
      this.log.error('SMTP verify failed', err instanceof Error ? err.stack : String(err));
      return { success: false, message: `Authentication failed: ${err instanceof Error ? err.message : String(err)}` };
    }

    if (config.testRecipient) {
      try {
        await transport.sendMail({
          from: config.from,
          to: config.testRecipient,
          subject: 'UiDRAC Console — SMTP Test',
          text: 'This is a test email from the UiDRAC Console SMTP configuration. If you received this, your mail settings are working correctly.',
        });
        return { success: true, message: `SMTP authenticated and test email sent to ${config.testRecipient}.` };
      } catch (err) {
        this.log.error('SMTP test send failed', err instanceof Error ? err.stack : String(err));
        return { success: false, message: `Authenticated but send failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    }

    return { success: true, message: 'SMTP authentication successful.' };
  }
}
