import { profileService } from '../services/profile.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (req, res) => {
  const data = await profileService.get(req.user.id);
  res.status(200).json({ success: true, message: 'Profile loaded successfully', data });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await profileService.update(req.user.id, req.body);
  res.status(200).json({ success: true, message: 'Profile updated successfully', data });
});

export const changePassword = asyncHandler(async (req, res) => {
  const data = await profileService.changePassword(req.user.id, req.body);
  res.status(200).json({ success: true, message: 'Password changed successfully', data });
});

export const listAddresses = asyncHandler(async (req, res) => {
  const items = await profileService.listAddresses(req.user.id);
  res.status(200).json({ success: true, message: 'Delivery addresses loaded', data: { items } });
});

export const createAddress = asyncHandler(async (req, res) => {
  const item = await profileService.createAddress(req.user.id, req.body);
  res.status(201).json({ success: true, message: 'Delivery address created', data: { item } });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const item = await profileService.updateAddress(req.user.id, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Delivery address updated', data: { item } });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const data = await profileService.deleteAddress(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: 'Delivery address deleted', data });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const item = await profileService.setDefaultAddress(req.user.id, req.params.id);
  res.status(200).json({ success: true, message: 'Default delivery address updated', data: { item } });
});
