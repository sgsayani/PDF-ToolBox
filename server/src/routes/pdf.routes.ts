import { Router } from 'express';

import { convertController } from '../controllers/convert.controller.js';
import { pdfController } from '../controllers/pdf.controller.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  mergeSchema,
  organizeSchema,
  pageNumbersSchema,
  removeMetadataSchema,
  signSchema,
  splitSchema,
  toJpgSchema,
  toWordSchema,
  watermarkSchema,
} from '../validators/pdf.validators.js';

export const pdfRouter = Router();

pdfRouter.use(processingRateLimiter);

/**
 * Each operation takes the id of an already-uploaded file plus its options and
 * returns a *new* stored file. Inputs are never mutated, so a user can run an
 * operation, review the result, and still go back to the original.
 *
 * Deleting, reordering and rotating pages are one operation here rather than
 * three: they are the same transformation with different parameters, and
 * separating them would force clients to chain requests that could each fail
 * halfway through an edit.
 */
pdfRouter.post('/organize', validateBody(organizeSchema), asyncHandler(pdfController.organize));
pdfRouter.post('/split', validateBody(splitSchema), asyncHandler(pdfController.split));
pdfRouter.post('/merge', validateBody(mergeSchema), asyncHandler(pdfController.merge));

/**
 * Phase 2: content edits. Each still takes a working file's id and returns a
 * new stored file, exactly like the operations above.
 */
pdfRouter.post('/watermark', validateBody(watermarkSchema), asyncHandler(pdfController.watermark));
pdfRouter.post(
  '/page-numbers',
  validateBody(pageNumbersSchema),
  asyncHandler(pdfController.pageNumbers),
);
pdfRouter.post(
  '/remove-metadata',
  validateBody(removeMetadataSchema),
  asyncHandler(pdfController.removeMetadata),
);
pdfRouter.post('/sign', validateBody(signSchema), asyncHandler(pdfController.sign));

/**
 * Phase 3: conversions. `to-jpg` and `to-word` produce a file that isn't a
 * PDF, so they're handled by `convertController` rather than the shared
 * `executeOperation` pipeline above (see that controller's comment).
 */
pdfRouter.post('/to-jpg', validateBody(toJpgSchema), asyncHandler(convertController.toJpg));
pdfRouter.post('/to-word', validateBody(toWordSchema), asyncHandler(convertController.toWord));
