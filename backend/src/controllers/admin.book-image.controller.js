import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { adminService } from '../services/admin.service.js';
import { AppError } from '../utils/AppError.js';
import { bookImagesDirectory } from '../config/uploads.js';

function detectImage(buffer) {
  if (buffer?.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: '.jpg', mime: 'image/jpeg' };
  }
  if (buffer?.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { extension: '.png', mime: 'image/png' };
  }
  if (buffer?.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: '.webp', mime: 'image/webp' };
  }
  return null;
}

function managedImageFilename(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/books/')) return null;
  const filename = path.basename(imageUrl);
  return filename === imageUrl.slice('/uploads/books/'.length) ? filename : null;
}

async function removeManagedImage(imageUrl) {
  const filename = managedImageFilename(imageUrl);
  if (filename) await unlink(path.join(bookImagesDirectory, filename)).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

export async function uploadBookImage(req, res) {
  if (!req.file) throw new AppError('Choose an image file to upload', 400, 'IMAGE_REQUIRED');
  const detected = detectImage(req.file.buffer);
  if (!detected) throw new AppError('The uploaded file is not a supported image', 422, 'INVALID_IMAGE');

  // Keep the actual file format and the validated image signature in agreement.
  if (req.file.mimetype !== detected.mime) throw new AppError('Image content does not match its file type', 422, 'INVALID_IMAGE');

  const book = await adminService.getBook(req.params.id);
  await mkdir(bookImagesDirectory, { recursive: true });
  const filename = `${randomUUID()}${detected.extension}`;
  const imageUrl = `/uploads/books/${filename}`;
  const filePath = path.join(bookImagesDirectory, filename);

  await writeFile(filePath, req.file.buffer, { flag: 'wx' });
  let updatedBook;
  try {
    updatedBook = await adminService.updateBook(req.params.id, { image: imageUrl });
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  }
  await removeManagedImage(book.image).catch(() => {});
  return res.status(200).json({ success: true, message: 'Book image uploaded', data: { book: updatedBook, imageUrl } });
}

export async function deleteBookImage(req, res) {
  const book = await adminService.getBook(req.params.id);
  if (!book.image) throw new AppError('Book has no image to delete', 404, 'IMAGE_NOT_FOUND');
  const updatedBook = await adminService.updateBook(req.params.id, { image: null });
  await removeManagedImage(book.image);
  return res.json({ success: true, message: 'Book image deleted', data: updatedBook });
}
