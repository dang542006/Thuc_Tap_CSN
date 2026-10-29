import { prisma } from '../config/database.js';

export const BUILDER_CATEGORY_BY_SLOT = Object.freeze({
  cpu: 'cpu',
  motherboard: 'mainboard',
  ram: 'ram',
  gpu: 'gpu',
  storage: 'o-luu-tru',
  psu: 'nguon-may-tinh',
  cooler: 'tan-nhiet-cpu',
  case: 'case',
  fan: 'quat-case',
});

export const pcBuilderRepository = {
  async findCatalog() {
    const categories = await prisma.category.findMany({
      where: { slug: { in: Object.values(BUILDER_CATEGORY_BY_SLOT) }, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, slug: true,
        books: {
          where: { status: 'ACTIVE' },
          orderBy: [{ price: 'asc' }, { title: 'asc' }],
          select: {
            id: true, slug: true, title: true, brand: true, author: true,
            image: true, price: true, discountPrice: true, stock: true,
            specifications: true, categoryId: true,
          },
        },
      },
    });
    return categories;
  },

  findBooksByIds(ids) {
    return prisma.book.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      select: {
        id: true, slug: true, title: true, brand: true, author: true,
        image: true, price: true, discountPrice: true, stock: true,
        specifications: true, categoryId: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  },
};
