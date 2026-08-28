import { Router } from 'express';

import { filesController } from '../controllers/files.controller.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import { singlePdfUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const filesRouter = Router();

/**
 * Working files are uploaded once and then referenced by id, so a document is
 * never re-sent for each operation.
 */
filesRouter.post('/', processingRateLimiter, singlePdfUpload(), asyncHandler(filesController.upload));
filesRouter.get('/:id/download', asyncHandler(filesController.download));
filesRouter.get('/:id/metadata', asyncHandler(filesController.metadata));
filesRouter.get('/:id/extracted-text', asyncHandler(filesController.extractedText));
filesRouter.get('/:id/form', asyncHandler(filesController.form));
filesRouter.delete('/:id', asyncHandler(filesController.remove));
