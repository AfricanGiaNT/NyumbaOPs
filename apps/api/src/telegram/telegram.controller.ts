import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import TelegramBot from 'node-telegram-bot-api';
import { TelegramService } from './telegram.service';

@ApiTags('Telegram')
@Controller(['telegram', 'v1/telegram'])
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  async handleWebhook(
    @Body() update: TelegramBot.Update,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    await this.telegramService.handleUpdate(update, secret);
    return { ok: true };
  }
}
