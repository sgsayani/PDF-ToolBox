import { Router } from 'express';

import { securityController } from '../controllers/security.controller.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import { singlePdfUpload } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { protectSchema, removePasswordFieldsSchema } from '../validators/pdf.validators.js';

export const securityRouter = Router();

securityRouter.use(processingRateLimiter);

/**
 * Kept separate from `pdfRouter`: encrypting a document is not a content
 * transform, and its controller intentionally does not share the generic
 * `executeOperation` pipeline the content operations use.
 */
securityRouter.post('/protect', validateBody(protectSchema), asyncHandler(securityController.protect));

/**
 * `singlePdfUpload()` only checks extension/mime type — it never parses the
 * file — so an encrypted PDF passes through it fine. `validateBody` runs
 * after multer, so `req.body.password` (a plain multipart field) is
 * populated by the time it validates.
 */
securityRouter.post(
  '/remove-password',
  singlePdfUpload(),
  validateBody(removePasswordFieldsSchema),
  asyncHandler(securityController.removePassword),
);
