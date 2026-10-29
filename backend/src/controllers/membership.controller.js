import { membershipService } from '../services/membership.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyMembership = asyncHandler(async (req, res) => {
  const data = await membershipService.getMine(req.user.id);
  res.status(200).json({ success: true, message: 'Membership loaded successfully', data });
});

export const listMembershipTiers = asyncHandler(async (_req, res) => {
  const data = await membershipService.listTiers();
  res.status(200).json({ success: true, message: 'Membership tiers loaded successfully', data });
});
