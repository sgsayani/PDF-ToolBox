import { Router } from 'express';

import { documentsController } from '../controllers/documents.controller.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import { singleDocxUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const documentsRouter = Router();

/**
 * Kept separate from `filesRouter`/`pdfRouter`: a Word document is a
 * different resource from the PDF this app otherwise centres around, and —
 * like images-to-PDF — there is no "open document" yet when this runs.
 */
documentsRouter.post(
  '/to-pdf',
  processingRateLimiter,
  singleDocxUpload(),
  asyncHandler(documentsController.toPdf),
);
