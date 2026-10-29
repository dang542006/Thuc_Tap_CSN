import { Router } from 'express';
import { changePassword, createAddress, deleteAddress, getProfile, listAddresses, setDefaultAddress, updateAddress, updateProfile } from '../controllers/profile.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { addressCreateSchema, addressUpdateSchema, passwordChangeSchema, profileSchema } from '../validators/customer.validator.js';
import { listFavorites, toggleFavorite } from '../controllers/favorite.controller.js';

const router = Router();
router.use(authenticate);
router.get('/me', getProfile);
router.patch('/me', validate(profileSchema), updateProfile);
router.patch('/me/password', validate(passwordChangeSchema), changePassword);
router.route('/me/addresses')
  .get(listAddresses)
  .post(validate(addressCreateSchema), createAddress);
router.route('/me/addresses/:id')
  .patch(validate(addressUpdateSchema), updateAddress)
  .delete(deleteAddress);
router.patch('/me/addresses/:id/default', setDefaultAddress);
router.get('/me/favorites', listFavorites);
router.put('/me/favorites/:bookId', toggleFavorite);

export default router;
