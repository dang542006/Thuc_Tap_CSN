import { customerRepository } from '../repositories/customer.repository.js';
import { AppError } from '../utils/AppError.js';

export const membershipService = {
  async getMine(userId) {
    const [user, tiers] = await Promise.all([
      customerRepository.findPublicUser(userId),
      customerRepository.listMembershipTiers(),
    ]);
    if (!user) throw new AppError('User account was not found', 404, 'USER_NOT_FOUND');
    const currentIndex = tiers.findIndex((tier) => tier.level === user.membershipLevel);
    const nextTier = tiers[currentIndex + 1] ?? null;
    return {
      points: user.points,
      membershipLevel: user.membershipLevel,
      currentTier: tiers[currentIndex] ?? null,
      nextTier,
      pointsToNextLevel: nextTier ? Math.max(0, nextTier.minPoints - user.points) : 0,
      tiers,
    };
  },

  listTiers() { return customerRepository.listMembershipTiers(); },
};
