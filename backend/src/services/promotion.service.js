import { customerRepository } from '../repositories/customer.repository.js';

export const promotionService = {
  listActive() { return customerRepository.listActivePromotions(new Date()); },
};
