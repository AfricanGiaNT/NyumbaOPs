export type TelegramFlow =
  | 'add_income'
  | 'add_expense'
  | 'checkin'
  | 'checkout';

export type TelegramStep =
  | 'amount'
  | 'property'
  | 'category'
  | 'note'
  | 'booking'
  | 'checkin_note'
  | 'issue_type'
  | 'issue_note';

export type ConversationState = {
  userId: string;
  chatId: number;
  flow: TelegramFlow;
  step: TelegramStep;
  data: Record<string, unknown>;
  startedAt: number;
};
