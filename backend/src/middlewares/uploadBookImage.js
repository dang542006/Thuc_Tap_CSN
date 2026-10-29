import multer from 'multer';
import { bookImageMaxBytes } from '../config/uploads.js';
import { AppError } from '../utils/AppError.js';

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: bookImageMaxBytes, files: 1 },
  fileFilter(_req, file, callback) {
    const extension = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype.toLowerCase())) {
      return callback(new AppError('Only JPG, JPEG, PNG, and WEBP images are allowed', 422, 'INVALID_IMAGE_TYPE'));
    }
    callback(null, true);
  },
});

const parseBookImage = upload.single('image');

export default function uploadBookImage(req, res, next) {
  parseBookImage(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('Image must be 5 MB or smaller', 413, 'IMAGE_TOO_LARGE'));
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Upload exactly one image using the "image" field', 422, 'INVALID_IMAGE_FIELD'));
    }
    if (error instanceof multer.MulterError) {
      return next(new AppError('Image upload request is invalid', 400, 'INVALID_UPLOAD'));
    }
    next(error);
  });
}
