import { asyncHandler } from '../utils/asyncHandler.js';
import { pcBuilderService } from '../services/pcBuilder.service.js';

export const getPcBuilderCatalog = asyncHandler(async (_req, res) => {
  const data = await pcBuilderService.catalog();
  res.json({ success: true, message: 'PC Builder catalog loaded', data });
});

export const checkPcBuild = asyncHandler(async (req, res) => {
  const data = await pcBuilderService.check(req.body.selections);
  res.json({ success: true, message: 'PC configuration checked', data });
});

export const advisePcBuild = asyncHandler(async (req, res) => {
  const data = await pcBuilderService.advise(req.body);
  res.json({ success: true, message: 'PC build advice generated', data });
});
