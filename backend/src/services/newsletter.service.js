import { newsletterRepository } from '../repositories/newsletter.repository.js';

export const newsletterService = {
  async subscribe(email) {
    await newsletterRepository.subscribe(email.trim().toLowerCase());
    return { subscribed: true };
  },
};
