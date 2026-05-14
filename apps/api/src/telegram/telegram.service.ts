import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  CategoryType,
  Currency,
  TransactionType,
} from '@prisma/client';
import TelegramBot from 'node-telegram-bot-api';
import { AnalyticsService } from '../analytics/analytics.service';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { TransactionsService } from '../transactions/transactions.service';
import { ConversationState, TelegramFlow, TelegramStep } from './telegram.types';

const TELEGRAM_CREATED_VIA = 'TELEGRAM';
const CONVERSATION_TIMEOUT_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot | null = null;
  private readonly logger = new Logger(TelegramService.name);
  private readonly states = new Map<string, ConversationState>();
  private readonly rateLimits = new Map<string, { count: number; windowStart: number }>();
  private readonly weeklySent = new Map<string, string>();
  private cleanupTimer?: NodeJS.Timeout;
  private weeklyTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly categories: CategoriesService,
    private readonly properties: PropertiesService,
    private readonly transactions: TransactionsService,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set; bot is disabled.');
      return;
    }

    this.bot = new TelegramBot(token, { webHook: { autoOpen: false } });
    this.registerHandlers();
    this.startCleanupTimer();
    this.startWeeklySummaryScheduler();
  }

  async handleUpdate(update: TelegramBot.Update, secret?: string) {
    if (!this.bot) {
      return;
    }
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (expected && secret !== expected) {
      this.logger.warn('Telegram webhook secret mismatch.');
      return;
    }
    try {
      this.bot.processUpdate(update);
    } catch (error) {
      this.logger.error('Failed to process Telegram update.', error as Error);
    }
  }

  /**
   * Public helper: send a plain-text message to a Telegram chat by ID.
   * Used by WorksScheduler for daily reminders.
   */
  async sendMessage(telegramId: string, text: string) {
    if (!this.bot) return;
    try {
      await this.bot.sendMessage(Number(telegramId), text, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error(`Failed to send Telegram message to ${telegramId}`, error);
    }
  }

  async notifyNewBooking(bookingId: string) {
    if (!this.bot) {
      return;
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { property: true, guest: true },
    });
    if (!booking) {
      return;
    }

    const recipients = await this.prisma.notificationSettings.findMany({
      where: { bookingConfirmedTelegram: true },
      include: { user: true },
    });
    const message = [
      '🔔 New Booking',
      '',
      `🏠 ${booking.property.name}`,
      `📅 ${this.formatDateRange(booking.checkInDate, booking.checkOutDate)}`,
      `👤 ${booking.guest?.name ?? 'Guest'}`,
    ].join('\n');

    await Promise.all(
      recipients
        .filter((recipient) => recipient.user.telegramId)
        .map((recipient) =>
          this.bot!.sendMessage(Number(recipient.user.telegramId), message),
        ),
    );
  }

  private registerHandlers() {
    if (!this.bot) {
      return;
    }

    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    this.bot.onText(/\/summary/, (msg) => this.handleSummary(msg));
    this.bot.onText(/\/properties/, (msg) => this.handleProperties(msg));
    this.bot.onText(/\/property (.+)/, (msg, match) => this.handleProperty(msg, match?.[1]));
    this.bot.onText(/\/bookings/, (msg) => this.handleBookings(msg));
    this.bot.onText(/\/add_income/, (msg) => this.startTransactionFlow(msg, 'add_income'));
    this.bot.onText(/\/add_expense/, (msg) => this.startTransactionFlow(msg, 'add_expense'));
    this.bot.onText(/\/cancel/, (msg) => this.handleCancel(msg));
    this.bot.onText(/\/undo/, (msg) => this.handleUndo(msg));
    this.bot.onText(/\/checkin/, (msg) => this.startCheckinFlow(msg));
    this.bot.onText(/\/checkout/, (msg) => this.startCheckoutFlow(msg));
    this.bot.onText(/\/today/, (msg) => this.handleToday(msg));
    this.bot.onText(/\/status/, (msg) => this.handleStatus(msg));
    this.bot.onText(/\/settings/, (msg) => this.handleSettings(msg));

    this.bot.on('callback_query', (query) => this.handleCallback(query));
    this.bot.on('message', (msg) => this.handleMessage(msg));
  }

  private async handleStart(msg: TelegramBot.Message) {
    if (!this.bot || !msg.from) {
      return;
    }
    const chatId = msg.chat.id;
    const user = await this.findAuthorizedUser(msg.from);
    if (!user) {
      await this.bot.sendMessage(
        chatId,
        'Sorry, you are not authorized to use this bot.',
      );
      return;
    }

    await this.bot.sendMessage(
      chatId,
      `Welcome ${user.name ?? 'there'}! What would you like to do?`,
      { reply_markup: this.mainMenuKeyboard() },
    );
  }

  private async handleHelp(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }
    const text = [
      'Available commands:',
      '/summary - Current month summary',
      '/properties - List properties',
      '/property <name> - Property stats',
      '/bookings - Recent bookings',
      '/add_income - Log income',
      '/add_expense - Log expense',
      '/checkin - Guest check-in',
      '/checkout - Guest check-out',
      '/today - Today’s check-ins/check-outs',
      '/status - Occupancy status',
      '/undo - Undo last bot transaction',
      '/cancel - Cancel current flow',
      '/settings - Notification preferences',
    ].join('\n');
    await this.bot.sendMessage(context.chatId, text);
  }

  private async handleSummary(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }

    const summary = await this.analytics.getSummary();
    const lines = summary.totals.length
      ? summary.totals.map((entry) =>
          [
            entry.currency === Currency.MWK ? '🇲🇼 MWK' : '🇬🇧 GBP',
            `💰 Income: ${this.formatAmount(entry.currency, entry.revenue)}`,
            `❌ Expenses: ${this.formatAmount(entry.currency, entry.expense)}`,
            `📈 Profit: ${this.formatAmount(entry.currency, entry.profit)}`,
          ].join('\n'),
        )
      : ['No transactions yet.'];

    await this.bot.sendMessage(
      context.chatId,
      ['📊 Business Summary (This Month)', '', ...lines].join('\n'),
    );
  }

  private async handleProperties(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }

    const properties = await this.properties.findAll();
    if (properties.length === 0) {
      await this.bot.sendMessage(context.chatId, 'No properties found.');
      return;
    }

    const keyboard = properties.map((property) => [
      {
        text: property.name,
        callback_data: `property_${property.id}`,
      },
    ]);

    await this.bot.sendMessage(context.chatId, 'Select a property:', {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  private async handleProperty(msg: TelegramBot.Message, name?: string) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }
    if (!name) {
      await this.bot.sendMessage(context.chatId, 'Usage: /property <name>');
      return;
    }

    const matches = await this.prisma.property.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
    });

    if (matches.length === 0) {
      await this.bot.sendMessage(context.chatId, 'Property not found.');
      return;
    }
    if (matches.length > 1) {
      await this.bot.sendMessage(
        context.chatId,
        'Multiple matches found. Use /properties to pick.',
      );
      return;
    }

    await this.sendPropertySummary(context.chatId, matches[0].id);
  }

  private async handleBookings(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }

    const bookings = await this.prisma.booking.findMany({
      orderBy: { checkInDate: 'desc' },
      take: 5,
      include: { property: true, guest: true },
    });

    if (bookings.length === 0) {
      await this.bot.sendMessage(context.chatId, 'No bookings found.');
      return;
    }

    const lines = bookings.map((booking) => {
      const nights = this.calculateNights(booking.checkInDate, booking.checkOutDate);
      return `• ${booking.property.name} – ${nights} nights (${booking.status})`;
    });

    await this.bot.sendMessage(context.chatId, ['📅 Recent Bookings', '', ...lines].join('\n'));
  }

  private async startTransactionFlow(msg: TelegramBot.Message, flow: TelegramFlow) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }

    this.setState(context.user.telegramId!, context.chatId, flow, 'amount', {});
    await this.bot.sendMessage(
      context.chatId,
      'Enter amount:',
      { reply_markup: this.cancelKeyboard() },
    );
  }

  private async handleCancel(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }
    const existing = this.states.get(context.user.telegramId!);
    if (existing) {
      this.states.delete(context.user.telegramId!);
      await this.bot.sendMessage(
        context.chatId,
        '❌ Operation cancelled.\n\nWhat would you like to do?',
        { reply_markup: this.mainMenuKeyboard() },
      );
      return;
    }

    await this.bot.sendMessage(
      context.chatId,
      'ℹ️ Nothing to cancel.\n\nWhat would you like to do?',
      { reply_markup: this.mainMenuKeyboard() },
    );
  }

  private async handleUndo(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        createdBy: context.user.id,
        createdVia: TELEGRAM_CREATED_VIA,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!transaction) {
      await this.bot.sendMessage(
        context.chatId,
        "ℹ️ Nothing to undo. You haven't added any transactions via Telegram recently.",
      );
      return;
    }

    const elapsed = Date.now() - transaction.createdAt.getTime();
    if (elapsed > 5 * 60 * 1000) {
      await this.bot.sendMessage(
        context.chatId,
        '⏰ Cannot undo. Your last transaction was added more than 5 minutes ago.',
      );
      return;
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Yes, Delete', callback_data: `undo_confirm_${transaction.id}` },
          { text: 'No, Keep It', callback_data: 'undo_cancel' },
        ],
      ],
    };
    await this.bot.sendMessage(
      context.chatId,
      `↩️ Undo Last Transaction?\nAmount: ${this.formatAmount(
        transaction.currency,
        transaction.amount,
      )}\n\nAre you sure you want to delete this?`,
      { reply_markup: keyboard },
    );
  }

  private async startCheckinFlow(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }
    const bookings = await this.findCheckinBookings();
    if (bookings.length === 0) {
      await this.bot.sendMessage(context.chatId, 'No check-ins found for today.');
      return;
    }
    this.setState(context.user.telegramId!, context.chatId, 'checkin', 'booking', {});
    await this.bot.sendMessage(context.chatId, 'Select the booking:', {
      reply_markup: { inline_keyboard: bookings.map((booking) => this.bookingButton(booking)) },
    });
  }

  private async startCheckoutFlow(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }
    const bookings = await this.findCheckoutBookings();
    if (bookings.length === 0) {
      await this.bot.sendMessage(context.chatId, 'No check-outs found for today.');
      return;
    }
    this.setState(context.user.telegramId!, context.chatId, 'checkout', 'booking', {});
    await this.bot.sendMessage(context.chatId, 'Select the booking:', {
      reply_markup: { inline_keyboard: bookings.map((booking) => this.bookingButton(booking)) },
    });
  }

  private async handleToday(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }
    const [checkins, checkouts] = await Promise.all([
      this.findCheckinBookings(),
      this.findCheckoutBookings(),
    ]);

    const checkinLines = checkins.length
      ? checkins.map((booking) => `• ${booking.property.name} (${booking.guest?.name ?? 'Guest'})`)
      : ['No check-ins today.'];
    const checkoutLines = checkouts.length
      ? checkouts.map((booking) => `• ${booking.property.name} (${booking.guest?.name ?? 'Guest'})`)
      : ['No check-outs today.'];

    await this.bot.sendMessage(
      context.chatId,
      [
        "📅 Today's Schedule",
        '',
        'Check-ins:',
        ...checkinLines,
        '',
        'Check-outs:',
        ...checkoutLines,
      ].join('\n'),
    );
  }

  private async handleStatus(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }

    const properties = await this.prisma.property.findMany({
      orderBy: { name: 'asc' },
    });
    if (properties.length === 0) {
      await this.bot.sendMessage(context.chatId, 'No properties found.');
      return;
    }

    const today = new Date();
    const occupied = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CHECKED_IN,
        checkInDate: { lte: today },
        checkOutDate: { gt: today },
      },
      select: { propertyId: true },
    });
    const occupiedIds = new Set(occupied.map((booking) => booking.propertyId));

    const lines = properties.map((property) => {
      const status = occupiedIds.has(property.id) ? 'Occupied' : 'Available';
      return `• ${property.name}: ${status}`;
    });

    await this.bot.sendMessage(context.chatId, ['🏠 Occupancy Status', '', ...lines].join('\n'));
  }

  private async handleSettings(msg: TelegramBot.Message) {
    const context = await this.ensureAuthorizedContext(msg);
    if (!context || !this.bot) {
      return;
    }
    const settings = await this.getOrCreateSettings(context.user.id);
    await this.bot.sendMessage(context.chatId, this.formatSettingsMessage(settings), {
      reply_markup: this.settingsKeyboard(settings),
    });
  }

  private async handleCallback(query: TelegramBot.CallbackQuery) {
    if (!this.bot || !query.message || !query.from) {
      return;
    }
    const context = await this.ensureAuthorizedContext({
      chat: query.message.chat,
      from: query.from,
    } as TelegramBot.Message);
    if (!context) {
      return;
    }

    const data = query.data ?? '';
    await this.bot.answerCallbackQuery(query.id);

    if (this.isRateLimited(context.user.telegramId!)) {
      await this.bot.sendMessage(context.chatId, '⏳ Too many requests. Try again shortly.');
      return;
    }

    if (data === 'summary') {
      await this.handleSummary(context.message);
      return;
    }
    if (data === 'add_income') {
      await this.startTransactionFlow(context.message, 'add_income');
      return;
    }
    if (data === 'add_expense') {
      await this.startTransactionFlow(context.message, 'add_expense');
      return;
    }
    if (data === 'bookings') {
      await this.handleBookings(context.message);
      return;
    }
    if (data === 'cancel') {
      await this.handleCancel(context.message);
      return;
    }

    if (data.startsWith('property_')) {
      const propertyId = data.replace('property_', '');
      await this.sendPropertySummary(context.chatId, propertyId);
      return;
    }

    if (data.startsWith('prop_') || data === 'prop_general') {
      await this.handlePropertySelection(context, data);
      return;
    }

    if (data.startsWith('cat_')) {
      await this.handleCategorySelection(context, data.replace('cat_', ''));
      return;
    }

    if (data.startsWith('undo_confirm_')) {
      await this.confirmUndo(context, data.replace('undo_confirm_', ''));
      return;
    }
    if (data === 'undo_cancel') {
      await this.bot.sendMessage(context.chatId, '✓ Transaction kept.');
      return;
    }

    if (data.startsWith('booking_')) {
      await this.handleBookingSelection(context, data.replace('booking_', ''));
      return;
    }

    if (data.startsWith('issue_')) {
      await this.handleIssueSelection(context, data.replace('issue_', ''));
      return;
    }

    if (data === 'settings_toggle_weekly') {
      await this.toggleSetting(context, 'weeklySummaryTelegram');
      return;
    }
    if (data === 'settings_toggle_booking') {
      await this.toggleSetting(context, 'bookingConfirmedTelegram');
      return;
    }
    if (data === 'settings_toggle_inquiry') {
      await this.toggleSetting(context, 'newInquiryTelegram');
      return;
    }
  }

  private async handleMessage(msg: TelegramBot.Message) {
    if (!this.bot || !msg.from || !msg.text) {
      return;
    }

    const user = await this.findAuthorizedUser(msg.from);
    if (!user) {
      return;
    }
    const state = this.states.get(msg.from.id.toString());
    if (!state) {
      return;
    }

    const isCommand = msg.text.startsWith('/');
    const isSkip = msg.text.trim().toLowerCase() === '/skip';
    if (isCommand && !isSkip) {
      return;
    }
    if (this.isConversationTimedOut(state)) {
      this.states.delete(state.userId);
      await this.bot.sendMessage(
        msg.chat.id,
        '⏰ Your previous operation timed out.\n\nType /start to begin again.',
      );
      return;
    }

    if (this.isRateLimited(msg.from.id.toString())) {
      await this.bot.sendMessage(msg.chat.id, '⏳ Too many requests. Try again shortly.');
      return;
    }

    if (state.flow === 'add_income' || state.flow === 'add_expense') {
      await this.handleTransactionMessage(msg, state, user.id);
      return;
    }

    if (state.flow === 'checkin' && state.step === 'checkin_note') {
      const note = isSkip ? undefined : msg.text;
      await this.finishCheckin(state, user.id, note);
      return;
    }

    if (state.flow === 'checkout' && state.step === 'issue_note') {
      const note = isSkip ? undefined : msg.text;
      await this.finishCheckout(state, user.id, note);
      return;
    }
  }

  private async handleTransactionMessage(
    msg: TelegramBot.Message,
    state: ConversationState,
    userId: string,
  ) {
    if (!this.bot || !msg.text) {
      return;
    }
    if (state.step === 'amount') {
      const amount = Number(msg.text.replace(/[, ]/g, ''));
      if (!Number.isFinite(amount) || amount <= 0) {
        await this.bot.sendMessage(msg.chat.id, 'Please enter a valid amount.');
        return;
      }
      state.data.amount = Math.floor(amount);
      state.step = 'property';
      await this.promptPropertySelection(msg.chat.id);
      return;
    }

    if (state.step === 'note') {
      const text = msg.text.trim();
      if (text.toLowerCase() === 'skip' || text.toLowerCase() === '/skip') {
        state.data.notes = undefined;
      } else {
        state.data.notes = text;
      }
      await this.finalizeTransaction(msg, state, userId);
    }
  }

  private async promptPropertySelection(chatId: number) {
    if (!this.bot) {
      return;
    }
    const properties = await this.properties.findAll();
    const keyboard = properties.map((property) => [
      { text: property.name, callback_data: `prop_${property.id}` },
    ]);
    keyboard.push([{ text: 'General (All Properties)', callback_data: 'prop_general' }]);
    keyboard.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);
    await this.bot.sendMessage(chatId, 'Select property:', {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  private async handlePropertySelection(context: AuthorizedContext, data: string) {
    const state = this.states.get(context.user.telegramId!);
    if (!state || (state.flow !== 'add_income' && state.flow !== 'add_expense')) {
      return;
    }
    if (data === 'prop_general') {
      state.data.propertyId = null;
    } else {
      state.data.propertyId = data.replace('prop_', '');
    }
    state.step = 'category';

    const categoryType =
      state.flow === 'add_income' ? CategoryType.REVENUE : CategoryType.EXPENSE;
    const categories = await this.categories.findAll(categoryType);
    const keyboard = categories.map((category) => [
      { text: category.name, callback_data: `cat_${category.id}` },
    ]);
    keyboard.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    await this.bot!.sendMessage(context.chatId, 'Select category:', {
      reply_markup: { inline_keyboard: keyboard },
    });
  }

  private async handleCategorySelection(context: AuthorizedContext, categoryId: string) {
    const state = this.states.get(context.user.telegramId!);
    if (!state || (state.flow !== 'add_income' && state.flow !== 'add_expense')) {
      return;
    }
    state.data.categoryId = categoryId;
    state.step = 'note';
    await this.bot!.sendMessage(
      context.chatId,
      'Optional note? Send it now or type "skip".',
      { reply_markup: this.cancelKeyboard() },
    );
  }

  private async finalizeTransaction(
    msg: TelegramBot.Message,
    state: ConversationState,
    userId: string,
  ) {
    if (!this.bot) {
      return;
    }
    const type = state.flow === 'add_income' ? TransactionType.REVENUE : TransactionType.EXPENSE;
    const dto = {
      categoryId: String(state.data.categoryId),
      amount: Number(state.data.amount),
      currency: Currency.MWK,
      date: new Date().toISOString(),
      notes: state.data.notes ? String(state.data.notes) : undefined,
      propertyId: state.data.propertyId ? String(state.data.propertyId) : undefined,
    };

    const transaction = await this.transactions.create(type, dto, userId, {
      createdVia: TELEGRAM_CREATED_VIA,
      telegramMessageId: msg.message_id,
    });

    this.states.delete(state.userId);

    await this.bot.sendMessage(
      msg.chat.id,
      [
        '✅ Transaction recorded',
        `💰 ${this.formatAmount(transaction.currency, transaction.amount)}`,
        `📅 ${transaction.date.toISOString().slice(0, 10)}`,
      ].join('\n'),
    );
  }

  private async confirmUndo(context: AuthorizedContext, transactionId: string) {
    if (!this.bot) {
      return;
    }
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction) {
      await this.bot.sendMessage(context.chatId, 'Transaction not found.');
      return;
    }
    if (transaction.createdBy !== context.user.id || transaction.createdVia !== TELEGRAM_CREATED_VIA) {
      await this.bot.sendMessage(context.chatId, 'Cannot undo this transaction.');
      return;
    }
    const elapsed = Date.now() - transaction.createdAt.getTime();
    if (elapsed > 5 * 60 * 1000) {
      await this.bot.sendMessage(
        context.chatId,
        '⏰ Cannot undo. Your last transaction was added more than 5 minutes ago.',
      );
      return;
    }
    await this.transactions.remove(transactionId, context.user.id);
    await this.bot.sendMessage(context.chatId, '✅ Transaction deleted.');
  }

  private async handleBookingSelection(context: AuthorizedContext, bookingId: string) {
    const state = this.states.get(context.user.telegramId!);
    if (!state) {
      return;
    }
    state.data.bookingId = bookingId;

    if (state.flow === 'checkin') {
      state.step = 'checkin_note';
      await this.bot!.sendMessage(
        context.chatId,
        'Add check-in notes? Reply with notes or type "skip".',
        { reply_markup: this.cancelKeyboard() },
      );
      return;
    }

    if (state.flow === 'checkout') {
      state.step = 'issue_type';
      const keyboard = [
        [{ text: 'Check Out - No Issues', callback_data: 'issue_none' }],
        [{ text: 'Property Damage', callback_data: 'issue_property_damage' }],
        [{ text: 'Extra Cleaning Needed', callback_data: 'issue_extra_cleaning' }],
        [{ text: 'Unpaid Balance', callback_data: 'issue_unpaid_balance' }],
        [{ text: 'Rule Violation', callback_data: 'issue_rule_violation' }],
        [{ text: 'Other Issue', callback_data: 'issue_other' }],
        [{ text: '❌ Cancel', callback_data: 'cancel' }],
      ];
      await this.bot!.sendMessage(context.chatId, 'Any issues to report?', {
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  }

  private async handleIssueSelection(context: AuthorizedContext, issueType: string) {
    const state = this.states.get(context.user.telegramId!);
    if (!state || state.flow !== 'checkout') {
      return;
    }
    if (issueType === 'none') {
      await this.finishCheckout(state, context.user.id);
      return;
    }
    state.data.issueType = issueType;
    state.step = 'issue_note';
    await this.bot!.sendMessage(
      context.chatId,
      'Describe the issue (or type "skip" to continue).',
      { reply_markup: this.cancelKeyboard() },
    );
  }

  private async finishCheckin(state: ConversationState, userId: string, note?: string) {
    if (!this.bot) {
      return;
    }
    const bookingId = String(state.data.bookingId);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      await this.bot.sendMessage(state.chatId, 'Booking not found.');
      this.states.delete(state.userId);
      return;
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      await this.bot.sendMessage(state.chatId, 'Booking is not ready for check-in.');
      this.states.delete(state.userId);
      return;
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_IN,
        actualCheckIn: new Date(),
        checkInNotes: note && note.trim().toLowerCase() !== 'skip' ? note : undefined,
        checkedInBy: userId,
      },
    });

    this.states.delete(state.userId);
    await this.bot.sendMessage(state.chatId, '✅ Checked In!');
  }

  private async finishCheckout(state: ConversationState, userId: string, note?: string) {
    if (!this.bot) {
      return;
    }
    const bookingId = String(state.data.bookingId);
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      await this.bot.sendMessage(state.chatId, 'Booking not found.');
      this.states.delete(state.userId);
      return;
    }
    if (booking.status !== BookingStatus.CHECKED_IN) {
      await this.bot.sendMessage(state.chatId, 'Booking is not currently checked in.');
      this.states.delete(state.userId);
      return;
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        actualCheckOut: new Date(),
        checkOutNotes: note && note.trim().toLowerCase() !== 'skip' ? note : undefined,
        checkOutIssueType: state.data.issueType
          ? String(state.data.issueType)
          : undefined,
        checkedOutBy: userId,
      },
    });

    this.states.delete(state.userId);
    await this.bot.sendMessage(state.chatId, '✅ Checked Out!');
  }

  private async sendPropertySummary(chatId: number, propertyId: string) {
    if (!this.bot) {
      return;
    }
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      await this.bot.sendMessage(chatId, 'Property not found.');
      return;
    }

    const summary = await this.analytics.getPropertySummary(propertyId);
    const lines = summary.totals.length
      ? summary.totals.map((entry) =>
          [
            entry.currency === Currency.MWK ? '🇲🇼 MWK' : '🇬🇧 GBP',
            `💰 Income: ${this.formatAmount(entry.currency, entry.revenue)}`,
            `❌ Expenses: ${this.formatAmount(entry.currency, entry.expense)}`,
            `📈 Profit: ${this.formatAmount(entry.currency, entry.profit)}`,
          ].join('\n'),
        )
      : ['No transactions yet.'];

    await this.bot.sendMessage(
      chatId,
      [`🏠 ${property.name}`, '', ...lines].join('\n'),
    );
  }

  private async findCheckinBookings() {
    const today = this.startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        checkInDate: { gte: today, lt: tomorrow },
      },
      include: { property: true, guest: true },
      orderBy: { checkInDate: 'asc' },
    });
  }

  private async findCheckoutBookings() {
    const today = this.startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CHECKED_IN,
        checkOutDate: { gte: today, lt: tomorrow },
      },
      include: { property: true, guest: true },
      orderBy: { checkOutDate: 'asc' },
    });
  }

  private bookingButton(booking: {
    id: string;
    property: { name: string };
    guest: { name: string } | null;
    checkInDate: Date;
    checkOutDate: Date;
  }) {
    const dates = this.formatDateRange(booking.checkInDate, booking.checkOutDate);
    return [
      {
        text: `${booking.property.name} (${dates})`,
        callback_data: `booking_${booking.id}`,
      },
    ];
  }

  private setState(
    telegramUserId: string,
    chatId: number,
    flow: TelegramFlow,
    step: TelegramStep,
    data: Record<string, unknown>,
  ) {
    this.states.set(telegramUserId, {
      userId: telegramUserId,
      chatId,
      flow,
      step,
      data,
      startedAt: Date.now(),
    });
  }

  private isConversationTimedOut(state: ConversationState) {
    return Date.now() - state.startedAt > CONVERSATION_TIMEOUT_MS;
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [userId, state] of this.states.entries()) {
        if (now - state.startedAt > CONVERSATION_TIMEOUT_MS) {
          this.states.delete(userId);
        }
      }
    }, 60000);
  }

  private startWeeklySummaryScheduler() {
    this.weeklyTimer = setInterval(() => this.sendWeeklySummariesIfDue(), 60000);
  }

  private async sendWeeklySummariesIfDue() {
    if (!this.bot) {
      return;
    }
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (minute !== 0) {
      return;
    }

    const settings = await this.prisma.notificationSettings.findMany({
      where: { weeklySummaryTelegram: true, weeklySummaryDay: day, weeklySummaryHour: hour },
      include: { user: true },
    });

    for (const setting of settings) {
      if (!setting.user.telegramId) {
        continue;
      }
      const key = `${setting.user.id}:${now.toISOString().slice(0, 10)}`;
      if (this.weeklySent.get(setting.user.id) === key) {
        continue;
      }

      const summary = await this.buildWeeklySummary(setting.user.id);
      await this.bot.sendMessage(Number(setting.user.telegramId), summary);
      this.weeklySent.set(setting.user.id, key);
    }
  }

  private async buildWeeklySummary(userId: string) {
    const end = this.startOfDay(new Date());
    const start = new Date(end);
    start.setDate(end.getDate() - 7);

    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
    });
    const totals = this.analyticsSummaryFromTransactions(transactions);

    const bookingsCount = await this.prisma.booking.count({
      where: { createdAt: { gte: start, lt: end } },
    });

    const lines = totals.length
      ? totals.map((entry) =>
          `${entry.currency === Currency.MWK ? '🇲🇼 MWK' : '🇬🇧 GBP'} ${this.formatAmount(
            entry.currency,
            entry.profit,
          )}`,
        )
      : ['No transactions recorded.'];

    return [
      '📊 Weekly Summary (Last 7 Days)',
      '',
      ...lines,
      '',
      `📅 Bookings created: ${bookingsCount}`,
    ].join('\n');
  }

  private analyticsSummaryFromTransactions(
    transactions: { currency: Currency; type: TransactionType; amount: number }[],
  ) {
    const map = new Map<Currency, { revenue: number; expense: number }>();
    transactions.forEach((transaction) => {
      const entry = map.get(transaction.currency) ?? { revenue: 0, expense: 0 };
      if (transaction.type === TransactionType.REVENUE) {
        entry.revenue += transaction.amount;
      } else {
        entry.expense += transaction.amount;
      }
      map.set(transaction.currency, entry);
    });
    return Array.from(map.entries()).map(([currency, values]) => ({
      currency,
      revenue: values.revenue,
      expense: values.expense,
      profit: values.revenue - values.expense,
    }));
  }

  private mainMenuKeyboard(): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: '📊 Summary', callback_data: 'summary' },
          { text: '➕ Add Income', callback_data: 'add_income' },
        ],
        [
          { text: '➖ Add Expense', callback_data: 'add_expense' },
          { text: '📅 Bookings', callback_data: 'bookings' },
        ],
      ],
    };
  }

  private cancelKeyboard(): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]],
    };
  }

  private async findAuthorizedUser(from: TelegramBot.User) {
    const telegramId = from.id.toString();
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });
    if (!user) {
      return null;
    }
    if (!user.telegramId) {
      return null;
    }
    if (!['OWNER', 'STAFF'].includes(user.role)) {
      return null;
    }
    return user;
  }

  private async ensureAuthorizedContext(msg: TelegramBot.Message): Promise<AuthorizedContext | null> {
    if (!msg.from) {
      return null;
    }
    if (this.isRateLimited(msg.from.id.toString())) {
      if (this.bot) {
        await this.bot.sendMessage(msg.chat.id, '⏳ Too many requests. Try again shortly.');
      }
      return null;
    }
    const user = await this.findAuthorizedUser(msg.from);
    if (!user) {
      if (this.bot) {
        await this.bot.sendMessage(
          msg.chat.id,
          'Sorry, you are not authorized to use this bot.',
        );
      }
      return null;
    }
    return { user, chatId: msg.chat.id, message: msg };
  }

  private formatAmount(currency: Currency, amount: number) {
    if (currency === Currency.USD) {
      return `$${amount.toLocaleString('en-US')}`;
    }
    return `MWK ${amount.toLocaleString('en-US')}`;
  }

  private formatDateRange(start: Date, end: Date) {
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    return `${startStr}–${endStr}`;
  }

  private calculateNights(start: Date, end: Date) {
    const diffMs = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  private startOfDay(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private isRateLimited(userId: string) {
    const now = Date.now();
    const entry = this.rateLimits.get(userId);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.rateLimits.set(userId, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX) {
      return true;
    }
    return false;
  }

  private async getOrCreateSettings(userId: string) {
    const existing = await this.prisma.notificationSettings.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.notificationSettings.create({
      data: { userId },
    });
  }

  private formatSettingsMessage(settings: {
    newInquiryTelegram: boolean;
    bookingConfirmedTelegram: boolean;
    weeklySummaryTelegram: boolean;
    weeklySummaryDay: number;
    weeklySummaryHour: number;
  }) {
    return [
      '⚙️ Bot Settings',
      `🔔 Inquiry Alerts: ${settings.newInquiryTelegram ? '✅ Enabled' : '❌ Disabled'}`,
      `🔔 Booking Alerts: ${settings.bookingConfirmedTelegram ? '✅ Enabled' : '❌ Disabled'}`,
      `📅 Weekly Report: ${settings.weeklySummaryTelegram ? '✅ Enabled' : '❌ Disabled'}`,
      `🗓️ Day: ${settings.weeklySummaryDay} | 🕐 Hour: ${settings.weeklySummaryHour}:00`,
      '',
      'Tap to toggle:',
    ].join('\n');
  }

  private settingsKeyboard(settings: { weeklySummaryTelegram: boolean }) {
    return {
      inline_keyboard: [
        [
          {
            text: settings.weeklySummaryTelegram ? 'Weekly Report ✅' : 'Weekly Report ❌',
            callback_data: 'settings_toggle_weekly',
          },
        ],
        [
          { text: 'Booking Alerts', callback_data: 'settings_toggle_booking' },
          { text: 'Inquiry Alerts', callback_data: 'settings_toggle_inquiry' },
        ],
      ],
    };
  }

  private async toggleSetting(
    context: AuthorizedContext,
    key: 'weeklySummaryTelegram' | 'bookingConfirmedTelegram' | 'newInquiryTelegram',
  ) {
    const settings = await this.getOrCreateSettings(context.user.id);
    const updated = await this.prisma.notificationSettings.update({
      where: { userId: context.user.id },
      data: { [key]: !settings[key] },
    });
    await this.bot!.sendMessage(context.chatId, this.formatSettingsMessage(updated), {
      reply_markup: this.settingsKeyboard(updated),
    });
  }
}

type AuthorizedContext = {
  user: { id: string; role: string; name: string | null; telegramId: string | null };
  chatId: number;
  message: TelegramBot.Message;
};
