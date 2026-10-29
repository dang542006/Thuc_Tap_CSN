import { Router } from 'express';
import { getBook, getRelatedBooks, listBooks } from '../controllers/book.controller.js';

const router = Router();
router.get('/', listBooks);
router.get('/:idOrSlug/related', getRelatedBooks);
router.get('/:idOrSlug', getBook);

export default router;
