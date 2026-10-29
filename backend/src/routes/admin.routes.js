import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as bookImageController from '../controllers/admin.book-image.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import uploadBookImage from '../middlewares/uploadBookImage.js';
import { imageUploadRateLimit } from '../middlewares/rateLimits.js';
import {
  bookCreateSchema, bookUpdateSchema, categoryCreateSchema, categoryUpdateSchema,
  orderStatusSchema, promotionCreateSchema, promotionUpdateSchema,
  membershipCreateSchema, membershipUpdateSchema,
  giftCardCreateSchema, giftCardUpdateSchema, giftCreateSchema, giftUpdateSchema,
} from '../validators/admin.validator.js';

const router = Router();
// Every route below is guarded. Customers receive 403 after successful authentication.
router.use(authenticate, authorize('ADMIN'));

const wrap = (handler) => asyncHandler(handler);

router.get('/dashboard', wrap(adminController.getDashboard));

router.route('/books')
  .get(wrap(adminController.listBooks))
  .post(validate(bookCreateSchema), wrap(adminController.createBook));
router.route('/books/:id')
  .get(wrap(adminController.getBook))
  .patch(validate(bookUpdateSchema), wrap(adminController.updateBook))
  .delete(wrap(adminController.deleteBook));
router.post('/books/:id/image', imageUploadRateLimit, uploadBookImage, wrap(bookImageController.uploadBookImage));
router.delete('/books/:id/image', wrap(bookImageController.deleteBookImage));

router.route('/categories')
  .get(wrap(adminController.listCategories))
  .post(validate(categoryCreateSchema), wrap(adminController.createCategory));
router.route('/categories/:id')
  .get(wrap(adminController.getCategory))
  .patch(validate(categoryUpdateSchema), wrap(adminController.updateCategory))
  .delete(wrap(adminController.deleteCategory));

router.get('/orders', wrap(adminController.listOrders));
router.get('/orders/:id', wrap(adminController.getOrder));
router.patch('/orders/:id/status', validate(orderStatusSchema), wrap(adminController.updateOrderStatus));

router.get('/customers', wrap(adminController.listCustomers));
router.get('/customers/:id', wrap(adminController.getCustomer));
router.patch('/customers/:id/lock', wrap(adminController.lockCustomer));
router.patch('/customers/:id/unlock', wrap(adminController.unlockCustomer));

router.get('/reviews', wrap(adminController.listReviews));
router.patch('/reviews/:id/approve', wrap(adminController.approveReview));
router.patch('/reviews/:id/hide', wrap(adminController.hideReview));
router.delete('/reviews/:id', wrap(adminController.deleteReview));

router.route('/promotions')
  .get(wrap(adminController.listPromotions))
  .post(validate(promotionCreateSchema), wrap(adminController.createPromotion));
router.route('/promotions/:id')
  .patch(validate(promotionUpdateSchema), wrap(adminController.updatePromotion))
  .delete(wrap(adminController.deletePromotion));
router.patch('/promotions/:id/activate', wrap(adminController.activatePromotion));
router.patch('/promotions/:id/deactivate', wrap(adminController.deactivatePromotion));

router.get('/membership', wrap(adminController.listMembership));
router.post('/membership', validate(membershipCreateSchema), wrap(adminController.createMembership));
router.patch('/membership/:id', validate(membershipUpdateSchema), wrap(adminController.updateMembership));
router.delete('/membership/:id', wrap(adminController.deleteMembership));
router.get('/reports', wrap(adminController.getReports));

router.route('/gift-cards')
  .get(wrap(adminController.listGiftCards))
  .post(validate(giftCardCreateSchema), wrap(adminController.createGiftCard));
router.route('/gift-cards/:id')
  .patch(validate(giftCardUpdateSchema), wrap(adminController.updateGiftCard))
  .delete(wrap(adminController.deleteGiftCard));
router.route('/gifts')
  .get(wrap(adminController.listGifts))
  .post(validate(giftCreateSchema), wrap(adminController.createGift));
router.route('/gifts/:id')
  .patch(validate(giftUpdateSchema), wrap(adminController.updateGift))
  .delete(wrap(adminController.deleteGift));

export default router;
