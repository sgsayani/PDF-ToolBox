import { Router } from 'express';

import { imagesController } from '../controllers/images.controller.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { singleImageUpload } from '../middleware/upload.js';
import { enforceUsageLimit } from '../middleware/usageLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { imagesToPdfSchema } from '../validators/pdf.validators.js';

export const imagesRouter = Router();

/**
 * Kept separate from `filesRouter`: images are a different resource from the
 * PDF this app otherwise centres around — there is no "open document" yet
 * when a user is building a PDF out of images, unlike every other tool.
 */
imagesRouter.post(
  '/',
  processingRateLimiter,
  singleImageUpload(),
  asyncHandler(imagesController.upload),
);
imagesRouter.post(
  '/to-pdf',
  processingRateLimiter,
  enforceUsageLimit(),
  validateBody(imagesToPdfSchema),
  asyncHandler(imagesController.toPdf),
);
