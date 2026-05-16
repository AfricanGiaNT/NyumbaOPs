import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface WorkForEmail {
  title: string;
  category: string;
  priority: string;
  scheduledDate?: Date | null;
  estimatedCost?: number | null;
  currency?: string | null;
  description?: string | null;
  notes?: string | null;
  property?: { name: string; location?: string | null } | null;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly gmailUser: string;
  private readonly anyDoEmail = 'task@any.do';

  constructor() {
    this.gmailUser = process.env.GMAIL_USER ?? '';
    const appPassword = process.env.GMAIL_APP_PASSWORD ?? '';

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.gmailUser,
        pass: appPassword,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
      greetingTimeout: 10000,
    });
  }

  async sendWorkOrderToAnyDo(work: WorkForEmail): Promise<void> {
    if (!this.gmailUser) {
      throw new Error('GMAIL_USER is not configured on the server');
    }
    if (!process.env.GMAIL_APP_PASSWORD) {
      throw new Error('GMAIL_APP_PASSWORD is not configured on the server');
    }

    const propertyLine = work.property
      ? `${work.property.name}${work.property.location ? ` — ${work.property.location}` : ''}`
      : 'Unknown';

    const scheduled = work.scheduledDate
      ? new Date(work.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Not set';

    const cost =
      work.estimatedCost
        ? `${work.currency ?? 'MWK'} ${work.estimatedCost.toLocaleString()}`
        : 'Not set';

    const body = [
      `Property: ${propertyLine}`,
      `Category: ${work.category}`,
      `Priority: ${work.priority}`,
      `Scheduled: ${scheduled}`,
      `Estimated Cost: ${cost}`,
      '',
      'Description:',
      work.description ?? 'None',
      '',
      'Notes:',
      work.notes ?? 'None',
    ].join('\n');

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SMTP connection timed out after 12s — port 587 on smtp.gmail.com may be blocked by the host')), 12000),
    );

    try {
      await Promise.race([
        this.transporter.sendMail({
          from: this.gmailUser,
          to: this.anyDoEmail,
          subject: `[Work Order] ${work.title}`,
          text: body,
        }),
        timeout,
      ]);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`Any.do email failed: ${detail}`);
      throw new Error(detail);
    }

    this.logger.log(`Sent work order "${work.title}" to Any.do`);
  }
}
