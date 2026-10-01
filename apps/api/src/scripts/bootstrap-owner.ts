import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const email = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Set BOOTSTRAP_OWNER_EMAIL and a BOOTSTRAP_OWNER_PASSWORD of at least 12 characters');
  }

  const prisma = new PrismaClient();
  try {
    const existingOwner = await prisma.user.findFirst({ where: { role: 'OWNER', passwordHash: { not: null } } });
    if (existingOwner) throw new Error('An owner password already exists; use email recovery instead');
    const hash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.role !== 'OWNER') throw new Error('This email belongs to a non-owner account');
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hash },
      create: { email, role: 'OWNER', passwordHash: hash },
    });
    process.stdout.write('Owner account initialized.\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Bootstrap failed'}\n`);
  process.exitCode = 1;
});
