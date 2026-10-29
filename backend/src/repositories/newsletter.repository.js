import { prisma } from '../config/database.js';

export const newsletterRepository = {
  subscribe(email) {
    return prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: { status: 'ACTIVE' },
      select: { id: true },
    });
  },
};
