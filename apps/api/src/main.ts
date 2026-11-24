import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  if (process.env.NODE_ENV === 'production') {
    const required = ['JWT_SECRET', 'GMAIL_USER', 'GMAIL_APP_PASSWORD', 'DASHBOARD_URL', 'RESERVATIONS_ADMIN_EMAIL'];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
    if ((process.env.JWT_SECRET?.length ?? 0) < 32) throw new Error('JWT_SECRET must have at least 32 characters');
    if (new URL(process.env.DASHBOARD_URL!).protocol !== 'https:') throw new Error('DASHBOARD_URL must use HTTPS');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.RESERVATIONS_ADMIN_EMAIL!)) throw new Error('RESERVATIONS_ADMIN_EMAIL must be one email address');
    if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_WEBHOOK_SECRET) {
      throw new Error('TELEGRAM_WEBHOOK_SECRET is required when the bot is enabled');
    }
  }
  // Trust the first proxy hop (Vercel/host load balancer) so per-IP rate
  // limiting reads the real client IP from X-Forwarded-For, not the proxy's.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(require('express').json({ limit: '20mb' }));
  app.use(require('express').urlencoded({ limit: '20mb', extended: true }));
  // Parse comma-separated extra origins (e.g. "https://madikweapartments.com,https://www.madikweapartments.com")
  const extraOrigins = process.env.EXTRA_ALLOWED_ORIGINS
    ? process.env.EXTRA_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);

      const allowed = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        // Production domains — both www and apex
        'https://madikweapartments.com',
        'https://www.madikweapartments.com',
        process.env.DASHBOARD_URL,
        process.env.PUBLIC_URL,
        process.env.DASHBOARD_NGROK_URL,
        ...extraOrigins,
      ].filter(Boolean) as string[];

      if (allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('NyumbaOps API')
    .setDescription('Property and financial core endpoints')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  }

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(process.env.PORT ?? 3001, process.env.HOST ?? '0.0.0.0');
}
bootstrap();
