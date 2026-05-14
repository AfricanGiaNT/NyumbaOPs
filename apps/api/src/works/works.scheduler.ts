import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class WorksScheduler {
  private readonly logger = new Logger(WorksScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Daily 8AM reminder: overdue works, works due today/tomorrow, low stock
   */
  @Cron('0 8 * * *', {
    name: 'works-daily-reminders',
    timeZone: 'Africa/Blantyre',
  })
  async handleDailyWorkReminders() {
    this.logger.log('Running daily works & inventory reminder...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      // 1. Overdue works
      const overdueWorks = await this.prisma.work.findMany({
        where: {
          scheduledDate: { lt: today },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: { property: { select: { name: true, location: true } } },
        orderBy: { scheduledDate: 'asc' },
      });

      // 2. Works due today or tomorrow
      const dueSoonWorks = await this.prisma.work.findMany({
        where: {
          scheduledDate: { gte: today, lt: dayAfterTomorrow },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: { property: { select: { name: true, location: true } } },
        orderBy: { scheduledDate: 'asc' },
      });

      // 3. Low stock items
      const allInventory = await this.prisma.inventoryItem.findMany({
        where: { minQuantity: { gt: 0 } },
        include: { property: { select: { name: true, location: true } } },
      });
      const lowStockItems = allInventory.filter(
        (item) => item.quantity < item.minQuantity,
      );

      // Nothing to report
      if (
        overdueWorks.length === 0 &&
        dueSoonWorks.length === 0 &&
        lowStockItems.length === 0
      ) {
        this.logger.log('No reminders to send today');
        return;
      }

      // Get all users with Telegram reminders enabled
      const recipients = await this.prisma.notificationSettings.findMany({
        where: { workRemindersTelegram: true },
        include: { user: { select: { telegramId: true } } },
      });

      const telegramUsers = recipients.filter((r) => r.user?.telegramId);
      if (telegramUsers.length === 0) {
        this.logger.log('No Telegram recipients with workRemindersTelegram enabled');
        return;
      }

      // Build message
      const lines: string[] = ['🔧 *Daily Works & Inventory Report*\n'];

      if (overdueWorks.length > 0) {
        lines.push(`⚠️ *OVERDUE WORKS (${overdueWorks.length})*`);
        overdueWorks.forEach((w) => {
          const loc = w.property.location
            ? ` — ${w.property.location}`
            : '';
          const scheduled = w.scheduledDate
            ? ` (due ${w.scheduledDate.toLocaleDateString('en-GB')})`
            : '';
          lines.push(`• ${w.title} — ${w.property.name}${loc} [${w.priority}]${scheduled}`);
        });
        lines.push('');
      }

      if (dueSoonWorks.length > 0) {
        lines.push(`📅 *DUE TODAY/TOMORROW (${dueSoonWorks.length})*`);
        dueSoonWorks.forEach((w) => {
          const loc = w.property.location
            ? ` — ${w.property.location}`
            : '';
          const isToday =
            w.scheduledDate &&
            w.scheduledDate >= today &&
            w.scheduledDate < tomorrow;
          const timing = isToday ? 'due today' : 'due tomorrow';
          lines.push(
            `• ${w.title} — ${w.property.name}${loc} [${w.priority}] — ${timing}`,
          );
        });
        lines.push('');
      }

      if (lowStockItems.length > 0) {
        lines.push(`📦 *LOW STOCK ALERTS (${lowStockItems.length})*`);
        lowStockItems.forEach((item) => {
          const loc = item.property.location
            ? ` — ${item.property.location}`
            : '';
          lines.push(
            `• ${item.name} — ${item.property.name}${loc} (${item.quantity} ${item.unit}, min ${item.minQuantity})`,
          );
        });
      }

      const message = lines.join('\n');

      // Send to all enabled users
      for (const recipient of telegramUsers) {
        try {
          await this.telegram.sendMessage(
            recipient.user.telegramId!,
            message,
          );
        } catch (err) {
          this.logger.error(
            `Failed to send reminder to telegramId ${recipient.user.telegramId}`,
            err,
          );
        }
      }

      this.logger.log(
        `Daily reminders sent to ${telegramUsers.length} user(s): ` +
          `${overdueWorks.length} overdue, ${dueSoonWorks.length} due soon, ${lowStockItems.length} low stock`,
      );
    } catch (error) {
      this.logger.error('Daily work reminders failed', error);
    }
  }
}
