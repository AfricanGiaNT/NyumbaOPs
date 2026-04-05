import { INestApplication, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  enableShutdownHooks(app: INestApplication) {
    app.enableShutdownHooks();
  }
}

