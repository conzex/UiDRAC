/** Outbound mail — password reset is always sent to the account email on file (never a caller-supplied address). */
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { publicAppUrl } from './edge-agent.config';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  private transporter() {
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
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
}
