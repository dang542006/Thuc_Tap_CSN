import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env.js';

const prisma = new PrismaClient();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bootstrap = dotenv.parse(readFileSync(resolve(root, '.env'), 'utf8'));
const adminEmail = (bootstrap.ADMIN_BOOTSTRAP_EMAIL || 'admin@techstore.local').trim().toLowerCase();
const baseUrl = process.env.ADMIN_VERIFY_API_URL || 'http://localhost:5000/api';

async function getStatus(url, token) {
  const response = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return response.status;
}

try {
  assert.match(adminEmail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  assert.ok(bootstrap.ADMIN_BOOTSTRAP_PASSWORD);
  const passwordBytes = Buffer.byteLength(bootstrap.ADMIN_BOOTSTRAP_PASSWORD, 'utf8');
  assert.ok(passwordBytes >= 8 && passwordBytes <= 72);

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: bootstrap.ADMIN_BOOTSTRAP_PASSWORD,
    }),
  });
  const loginBody = await login.json();
  assert.equal(login.status, 200, 'Admin login must succeed through the running API');
  assert.equal(loginBody.data.user.role, 'ADMIN');
  assert.equal(loginBody.data.user.status, 'ACTIVE');
  assert.equal(Object.hasOwn(loginBody.data.user, 'password'), false);

  const unauthenticatedStatus = await getStatus(`${baseUrl}/admin/dashboard`);
  const adminDashboardStatus = await getStatus(`${baseUrl}/admin/dashboard`, loginBody.data.token);
  assert.equal(unauthenticatedStatus, 401);
  assert.equal(adminDashboardStatus, 200);
  const adminResources = {};
  for (const resource of ['books', 'categories', 'orders', 'customers']) {
    adminResources[resource] = await getStatus(`${baseUrl}/admin/${resource}`, loginBody.data.token);
    assert.equal(adminResources[resource], 200, `Admin ${resource} API must be available`);
  }

  const customer = await prisma.user.findFirst({
    where: { role: 'CUSTOMER', status: 'ACTIVE' },
    select: { id: true },
  });
  assert.ok(customer, 'An active CUSTOMER account is required for the permission check');
  const customerToken = jwt.sign({ role: 'CUSTOMER' }, env.JWT_SECRET, { subject: customer.id, expiresIn: '1m' });
  const customerAdminStatus = await getStatus(`${baseUrl}/admin/dashboard`, customerToken);
  assert.equal(customerAdminStatus, 403);

  const adminPageStatus = await getStatus(process.env.ADMIN_VERIFY_FRONTEND_URL || 'http://localhost:5173/admin');
  assert.equal(adminPageStatus, 200);
  console.log(JSON.stringify({
    email: adminEmail,
    login: login.status,
    backendRole: loginBody.data.user.role,
    adminDashboard: adminDashboardStatus,
    adminResources,
    unauthenticatedAdminApi: unauthenticatedStatus,
    customerAdminApi: customerAdminStatus,
    adminFrontendRoute: adminPageStatus,
  }));
} finally {
  await prisma.$disconnect();
}
