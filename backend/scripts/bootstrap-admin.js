import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const DEFAULT_EMAIL = 'admin@techstore.local';
const NAME = 'TechStore Local Admin';
const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../.env');
const localEnv = dotenv.config({ path: ENV_PATH, override: true });
if (localEnv.error) throw new Error('Could not load backend/.env for local Admin bootstrap.');
const prisma = new PrismaClient();

function setEnvValue(contents, key, value) {
  const line = `${key}=${value}`;
  const expression = new RegExp(`^${key}=.*$`, 'gm');
  if (expression.test(contents)) return contents.replace(expression, line);
  return `${contents}${contents.endsWith('\n') || contents.length === 0 ? '' : '\n'}${line}\n`;
}

try {
  const existingEnv = await readFile(ENV_PATH, 'utf8');
  const parsedEnv = dotenv.parse(existingEnv);
  const email = (parsedEnv.ADMIN_BOOTSTRAP_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email address.');
  const password = parsedEnv.ADMIN_BOOTSTRAP_PASSWORD || randomBytes(36).toString('base64url');
  const passwordBytes = Buffer.byteLength(password, 'utf8');
  if (passwordBytes < 8 || passwordBytes > 72) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be between 8 and 72 UTF-8 bytes.');

  // Persist just the two bootstrap settings while preserving every other .env line.
  let nextEnv = setEnvValue(existingEnv, 'ADMIN_BOOTSTRAP_EMAIL', email);
  nextEnv = setEnvValue(nextEnv, 'ADMIN_BOOTSTRAP_PASSWORD', password);
  if (nextEnv !== existingEnv) await writeFile(ENV_PATH, nextEnv, 'utf8');

  const passwordHash = await bcrypt.hash(password, 12);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  let action = 'created';

  if (existingUser) {
    const passwordMatches = await bcrypt.compare(password, existingUser.password);
    const needsUpdate = existingUser.role !== 'ADMIN'
      || existingUser.status !== 'ACTIVE'
      || !passwordMatches;

    if (!needsUpdate) {
      action = 'already-configured';
    } else {
      action = existingUser.role !== 'ADMIN' ? 'promoted-designated-account'
        : existingUser.status !== 'ACTIVE' ? 'reactivated-designated-account'
          : 'rotated-designated-account-password';
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: passwordHash, role: 'ADMIN', status: 'ACTIVE' },
      });
    }
  } else {
    await prisma.user.create({
      data: {
        name: NAME,
        email,
        password: passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        cart: { create: {} },
      },
    });
  }

  const verified = await prisma.user.findUnique({
    where: { email },
    select: { email: true, role: true, status: true },
  });
  if (verified?.role !== 'ADMIN' || verified.status !== 'ACTIVE') {
    throw new Error('Admin bootstrap verification failed.');
  }

  console.log(JSON.stringify({ email, action, role: verified.role, status: verified.status, credentialsStoredIn: 'backend/.env' }));
} finally {
  await prisma.$disconnect();
}
