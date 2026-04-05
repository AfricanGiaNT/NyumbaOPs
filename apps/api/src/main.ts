import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'nyumbaops',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'nyumbaops.appspot.com',
  });
  
  // Connect to Storage emulator if configured
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  app.use(require('express').json({ limit: '20mb' }));
  app.use(require('express').urlencoded({ limit: '20mb', extended: true }));
  // Parse comma-separated extra origins (e.g. "https://madikweapartments.com,https://www.madikweapartments.com")
  const extraOrigins = process.env.EXTRA_ALLOWED_ORIGINS
    ? process.env.EXTRA_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      process.env.DASHBOARD_URL ?? 'http://localhost:3000',
      process.env.PUBLIC_URL ?? 'http://localhost:3001',
      process.env.DASHBOARD_NGROK_URL,
      ...extraOrigins,
    ].filter(Boolean),
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

  const config = new DocumentBuilder()
    .setTitle('NyumbaOps API')
    .setDescription('Property and financial core endpoints')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
