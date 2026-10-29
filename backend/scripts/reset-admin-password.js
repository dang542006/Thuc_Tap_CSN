import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const DEFAULT_EMAIL = 'admin@techstore.local';
const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../.env');
const loaded = dotenv.config({ path: ENV_PATH, override: true });
if (loaded.error) throw new Error('Could not load backend/.env for local Admin password reset.');

const localEnv = dotenv.parse(await readFile(ENV_PATH, 'utf8'));
const email = (localEnv.ADMIN_BOOTSTRAP_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
const password = localEnv.ADMIN_BOOTSTRAP_PASSWORD;
const lookupArg = process.argv.indexOf('--lookup-email');
const statusEmail = lookupArg >= 0 ? (process.argv[lookupArg + 1] || '').trim().toLowerCase() : email;
const prisma = new PrismaClient();

try {
const account = await prisma.user.findUnique({
    where: { email: statusEmail },
    select: { id: true, email: true, role: true, status: true, password: true },
  });

  if (process.argv.includes('--status')) {
    console.log(JSON.stringify({
      envFileLoaded: true,
      configuredEmail: email,
      inspectedEmail: statusEmail,
      passwordConfigured: typeof password === 'string' && password.length > 0,
      passwordLength: password?.length ?? 0,
      account: account ? { exists: true, role: account.role, status: account.status } : { exists: false },
    }));
  } else {
    assert.ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'ADMIN_BOOTSTRAP_EMAIL must be a valid email address.');
    assert.ok(typeof password === 'string', 'ADMIN_BOOTSTRAP_PASSWORD is missing from backend/.env.');
    const passwordBytes = Buffer.byteLength(password, 'utf8');
    assert.ok(passwordBytes >= 8 && passwordBytes <= 72, 'ADMIN_BOOTSTRAP_PASSWORD must be between 8 and 72 UTF-8 bytes.');
    assert.ok(account, 'The designated Admin account does not exist; use the local bootstrap command first.');
    assert.equal(account.role, 'ADMIN', 'Refusing to reset credentials unless the account already has ADMIN role.');
    assert.equal(account.status, 'ACTIVE', 'Refusing to reset credentials for an inactive Admin account.');

    const nextHash = await bcrypt.hash(password, 12);
    const updated = await prisma.user.updateMany({
      where: { id: account.id, email, role: 'ADMIN', status: 'ACTIVE', password: account.password },
      data: { password: nextHash },
    });
    assert.equal(updated.count, 1, 'Admin account changed during reset; no password was written.');
    assert.ok(await bcrypt.compare(password, nextHash));
    console.log(JSON.stringify({ email, reset: true, role: account.role, status: account.status, passwordVerifiedWithBcrypt: true }));
  }
} finally {
  await prisma.$disconnect();
}
