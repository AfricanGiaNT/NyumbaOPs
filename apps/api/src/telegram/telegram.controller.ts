import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import TelegramBot from 'node-telegram-bot-api';
import { TelegramService } from './telegram.service';
import { Public } from '../auth/public.decorator';

@ApiTags('Telegram')
@Controller(['telegram', 'v1/telegram'])
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() update: TelegramBot.Update,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    const accepted = await this.telegramService.handleUpdate(update, secret);
    if (!accepted) throw new UnauthorizedException('Invalid webhook request');
    return { ok: true };
  }
}
