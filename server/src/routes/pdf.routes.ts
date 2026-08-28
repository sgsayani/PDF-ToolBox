import { Router } from 'express';

import { convertController } from '../controllers/convert.controller.js';
import { ocrController } from '../controllers/ocr.controller.js';
import { pdfController } from '../controllers/pdf.controller.js';
import { pdfExportController } from '../controllers/pdfExport.controller.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import { enforceUsageLimit } from '../middleware/usageLimit.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  compressSchema,
  cropSchema,
  fillFormSchema,
  mergeSchema,
  ocrSchema,
  organizeSchema,
  pageNumbersSchema,
  redactSchema,
  removeMetadataSchema,
  scannerCleanupSchema,
  signSchema,
  splitSchema,
  toCsvSchema,
  toExcelSchema,
  toHtmlSchema,
  toJpgSchema,
  toPptxSchema,
  toWordSchema,
  translateSchema,
  watermarkSchema,
} from '../validators/pdf.validators.js';

export const pdfRouter = Router();

pdfRouter.use(processingRateLimiter);
// A no-op for anonymous requests — only checks a plan's daily allowance once a session is present.
pdfRouter.use(enforceUsageLimit());

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
pdfRouter.post('/fill-form', validateBody(fillFormSchema), asyncHandler(pdfController.fillForm));

/**
 * Phase 3: conversions. `to-jpg` and `to-word` produce a file that isn't a
 * PDF, so they're handled by `convertController` rather than the shared
 * `executeOperation` pipeline above (see that controller's comment).
 */
pdfRouter.post('/to-jpg', validateBody(toJpgSchema), asyncHandler(convertController.toJpg));
pdfRouter.post('/to-word', validateBody(toWordSchema), asyncHandler(convertController.toWord));

/**
 * Phase 5: scanned-document tools. `ocr` returns extracted text plus an
 * optional new stored file, so like `to-jpg`/`to-word` it has its own
 * controller; `scanner-cleanup` produces a normal PDF and reuses the shared
 * pipeline.
 */
pdfRouter.post('/ocr', validateBody(ocrSchema), asyncHandler(ocrController.run));
pdfRouter.post(
  '/scanner-cleanup',
  validateBody(scannerCleanupSchema),
  asyncHandler(pdfController.cleanup),
);

/**
 * Productization tools. `crop` and `redact` produce a normal PDF and reuse
 * the shared pipeline; `compress` returns size stats alongside the file and
 * `to-excel`/`to-csv`/`to-html`/`to-pptx` produce something that isn't a
 * PDF, so all of those get their own controller, same as `to-jpg`/`to-word`.
 */
pdfRouter.post('/compress', validateBody(compressSchema), asyncHandler(pdfController.compress));
pdfRouter.post('/crop', validateBody(cropSchema), asyncHandler(pdfController.crop));
pdfRouter.post('/redact', validateBody(redactSchema), asyncHandler(pdfController.redact));
pdfRouter.post('/translate', validateBody(translateSchema), asyncHandler(pdfController.translate));
pdfRouter.post('/to-excel', validateBody(toExcelSchema), asyncHandler(pdfExportController.toExcel));
pdfRouter.post('/to-csv', validateBody(toCsvSchema), asyncHandler(pdfExportController.toCsv));
pdfRouter.post('/to-html', validateBody(toHtmlSchema), asyncHandler(pdfExportController.toHtml));
pdfRouter.post('/to-pptx', validateBody(toPptxSchema), asyncHandler(pdfExportController.toPptx));
