import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { Public } from '../src/auth/public.decorator';
import { Roles } from '../src/auth/roles.decorator';
import { RolesGuard } from '../src/auth/roles.guard';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/prisma/prisma.service';

@Controller()
class AccessProbeController {
  @Get('public-probe')
  @Public()
  publicProbe() { return { ok: true }; }

  @Get('finance-probe')
  @Roles('OWNER')
  financeProbe() { return { ok: true }; }
}

describe('default API access policy', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PassportModule, JwtModule.register({ secret: process.env.JWT_SECRET })],
      controllers: [AccessProbeController],
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: { user: { findUnique: async ({ where }: { where: { id: string } }) => ({ id: where.id, role: where.id, tokenVersion: 0 }) } } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    jwt = module.get(JwtService);
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  const tokenFor = (role: string) => jwt.sign({ sub: role, role, ver: 0 });

  it('allows explicit public reads', async () => {
    await request(app.getHttpServer()).get('/public-probe').expect(200);
  });

  it('rejects anonymous financial reads', async () => {
    await request(app.getHttpServer()).get('/finance-probe').expect(401);
  });

  it('rejects staff and allows owners on financial reads', async () => {
    await request(app.getHttpServer()).get('/finance-probe').set('Authorization', `Bearer ${tokenFor('STAFF')}`).expect(403);
    await request(app.getHttpServer()).get('/finance-probe').set('Authorization', `Bearer ${tokenFor('OWNER')}`).expect(200);
  });
});
