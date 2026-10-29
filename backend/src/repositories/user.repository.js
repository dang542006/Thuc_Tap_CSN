import { prisma } from '../config/database.js';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  address: true,
  role: true,
  status: true,
  points: true,
  membershipLevel: true,
  createdAt: true,
  updatedAt: true,
};

export const userRepository = {
  findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },

  findPublicById(id) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  createWithDefaults({ email, password, name }) {
    return prisma.$transaction(async (tx) => tx.user.create({
      data: {
        email,
        password,
        name,
        cart: { create: {} },
      },
      select: publicUserSelect,
    }));
  },
};
