import { adminService } from '../services/admin.service.js';

const respond = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

export const getDashboard = async (req, res) => respond(res, 'Dashboard loaded', await adminService.dashboard());

export const listBooks = async (req, res) => respond(res, 'Books loaded', await adminService.listBooks(req.query));
export const getBook = async (req, res) => respond(res, 'Book loaded', await adminService.getBook(req.params.id));
export const createBook = async (req, res) => respond(res, 'Book created', await adminService.createBook(req.body), 201);
export const updateBook = async (req, res) => respond(res, 'Book updated', await adminService.updateBook(req.params.id, req.body));
export const deleteBook = async (req, res) => respond(res, 'Book deleted permanently', await adminService.deleteBook(req.params.id));

export const listCategories = async (req, res) => respond(res, 'Categories loaded', await adminService.listCategories(req.query));
export const getCategory = async (req, res) => respond(res, 'Category loaded', await adminService.getCategory(req.params.id));
export const createCategory = async (req, res) => respond(res, 'Category created', await adminService.createCategory(req.body), 201);
export const updateCategory = async (req, res) => respond(res, 'Category updated', await adminService.updateCategory(req.params.id, req.body));
export const deleteCategory = async (req, res) => respond(res, 'Category deleted permanently', await adminService.deleteCategory(req.params.id));

export const listOrders = async (req, res) => respond(res, 'Orders loaded', await adminService.listOrders(req.query));
export const getOrder = async (req, res) => respond(res, 'Order loaded', await adminService.getOrder(req.params.id));
export const updateOrderStatus = async (req, res) => respond(res, 'Order status updated', await adminService.updateOrderStatus(req.params.id, req.body.orderStatus));

export const listCustomers = async (req, res) => respond(res, 'Customers loaded', await adminService.listCustomers(req.query));
export const getCustomer = async (req, res) => respond(res, 'Customer loaded', await adminService.getCustomer(req.params.id));
export const lockCustomer = async (req, res) => respond(res, 'Customer locked', await adminService.setCustomerStatus(req.params.id, 'INACTIVE'));
export const unlockCustomer = async (req, res) => respond(res, 'Customer unlocked', await adminService.setCustomerStatus(req.params.id, 'ACTIVE'));

export const listReviews = async (req, res) => respond(res, 'Reviews loaded', await adminService.listReviews(req.query));
export const approveReview = async (req, res) => respond(res, 'Review approved', await adminService.setReviewStatus(req.params.id, 'ACTIVE'));
export const hideReview = async (req, res) => respond(res, 'Review hidden', await adminService.setReviewStatus(req.params.id, 'INACTIVE'));
export const deleteReview = async (req, res) => respond(res, 'Review deleted', await adminService.deleteReview(req.params.id));

export const listPromotions = async (req, res) => respond(res, 'Promotions loaded', await adminService.listPromotions(req.query));
export const createPromotion = async (req, res) => respond(res, 'Promotion created', await adminService.createPromotion(req.body), 201);
export const updatePromotion = async (req, res) => respond(res, 'Promotion updated', await adminService.updatePromotion(req.params.id, req.body));
export const deletePromotion = async (req, res) => respond(res, 'Promotion deleted', await adminService.deletePromotion(req.params.id));
export const activatePromotion = async (req, res) => respond(res, 'Promotion activated', await adminService.setPromotionStatus(req.params.id, 'ACTIVE'));
export const deactivatePromotion = async (req, res) => respond(res, 'Promotion deactivated', await adminService.setPromotionStatus(req.params.id, 'INACTIVE'));

export const listMembership = async (req, res) => respond(res, 'Membership tiers loaded', await adminService.listMembership(req.query));
export const createMembership = async (req, res) => respond(res, 'Membership tier created', await adminService.createMembership(req.body), 201);
export const updateMembership = async (req, res) => respond(res, 'Membership tier updated', await adminService.updateMembership(req.params.id, req.body));
export const deleteMembership = async (req, res) => respond(res, 'Membership tier deactivated', await adminService.deleteMembership(req.params.id));
export const getReports = async (req, res) => respond(res, 'Reports loaded', await adminService.reports(req.query));
export const listGiftCards = async (req, res) => respond(res, 'Gift cards loaded', await adminService.listGiftCards(req.query));
export const createGiftCard = async (req, res) => respond(res, 'Gift card created', await adminService.createGiftCard(req.body), 201);
export const updateGiftCard = async (req, res) => respond(res, 'Gift card updated', await adminService.updateGiftCard(req.params.id, req.body));
export const deleteGiftCard = async (req, res) => respond(res, 'Gift card deactivated', await adminService.deleteGiftCard(req.params.id));
export const listGifts = async (req, res) => respond(res, 'Gifts loaded', await adminService.listGifts(req.query));
export const createGift = async (req, res) => respond(res, 'Gift created', await adminService.createGift(req.body), 201);
export const updateGift = async (req, res) => respond(res, 'Gift updated', await adminService.updateGift(req.params.id, req.body));
export const deleteGift = async (req, res) => respond(res, 'Gift deactivated', await adminService.deleteGift(req.params.id));
