import bcrypt from 'bcrypt';
import { customerRepository } from '../repositories/customer.repository.js';
import { AppError } from '../utils/AppError.js';
import { userRepository } from '../repositories/user.repository.js';

export const profileService = {
  async get(userId) {
    const user = await customerRepository.findPublicUser(userId);
    if (!user) throw new AppError('User account was not found', 404, 'USER_NOT_FOUND');
    return user;
  },

  async update(userId, payload) {
    const normalized = { ...payload };
    if (normalized.email) {
      const existing = await userRepository.findByEmail(normalized.email);
      if (existing && existing.id !== userId) throw new AppError('Email đã được sử dụng bởi tài khoản khác.', 409, 'EMAIL_ALREADY_EXISTS');
    }
    return customerRepository.transaction(async (repository) => {
      const user = await repository.updateUser(userId, normalized);
      if (typeof normalized.address === 'string' && normalized.address.trim() && user.phone) {
        const savedAddress = await repository.defaultAddress(userId);
        const addressData = {
          receiverName: user.name,
          phoneNumber: user.phone,
          fullAddress: normalized.address.trim(),
          addressType: savedAddress?.addressType ?? 'HOME',
          defaultAddress: true,
        };
        if (savedAddress) await repository.updateAddress(userId, savedAddress.id, addressData);
        else await repository.createAddress(userId, addressData);
      }
      return user;
    });
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await customerRepository.findUser(userId);
    if (!user) throw new AppError('User account was not found', 404, 'USER_NOT_FOUND');
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
    const password = await bcrypt.hash(newPassword, 12);
    await customerRepository.updateUser(userId, { password });
    return { changed: true };
  },

  listAddresses(userId) {
    return customerRepository.listAddresses(userId);
  },

  async createAddress(userId, payload) {
    return customerRepository.transaction(async (repository) => {
      const addresses = await repository.listAddresses(userId);
      const makeDefault = payload.defaultAddress || addresses.length === 0;
      if (makeDefault) await repository.clearDefaultAddresses(userId);
      return repository.createAddress(userId, { ...payload, defaultAddress: makeDefault });
    });
  },

  async updateAddress(userId, id, payload) {
    return customerRepository.transaction(async (repository) => {
      const existing = await repository.findAddress(userId, id);
      if (!existing) throw new AppError('Delivery address was not found', 404, 'ADDRESS_NOT_FOUND');
      const makeDefault = payload.defaultAddress === true;
      if (makeDefault) await repository.clearDefaultAddresses(userId);
      const updated = await repository.updateAddress(userId, id, payload);
      if (existing.defaultAddress && payload.defaultAddress === false) {
        const replacement = await repository.firstAddress(userId);
        if (replacement) await repository.updateAddress(userId, replacement.id, { defaultAddress: true });
      }
      return updated;
    });
  },

  async deleteAddress(userId, id) {
    return customerRepository.transaction(async (repository) => {
      const existing = await repository.findAddress(userId, id);
      if (!existing) throw new AppError('Delivery address was not found', 404, 'ADDRESS_NOT_FOUND');
      await repository.deleteAddress(userId, id);
      if (existing.defaultAddress) {
        const replacement = await repository.firstAddress(userId);
        if (replacement) await repository.updateAddress(userId, replacement.id, { defaultAddress: true });
      }
      return { deleted: true };
    });
  },

  async setDefaultAddress(userId, id) {
    return customerRepository.transaction(async (repository) => {
      const existing = await repository.findAddress(userId, id);
      if (!existing) throw new AppError('Delivery address was not found', 404, 'ADDRESS_NOT_FOUND');
      await repository.clearDefaultAddresses(userId);
      return repository.updateAddress(userId, id, { defaultAddress: true });
    });
  },
};
