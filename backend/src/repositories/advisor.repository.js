import { prisma } from '../config/database.js';

export const advisorRepository = {
  findCandidates() {
    return prisma.book.findMany({
      where: { status: 'ACTIVE', stock: { gt: 0 }, category: { status: 'ACTIVE' } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 100,
      select: {
        id: true, slug: true, title: true, brand: true, author: true, image: true,
        price: true, discountPrice: true, stock: true, specifications: true,
        category: { select: { name: true, slug: true } },
      },
    });
  },
};
