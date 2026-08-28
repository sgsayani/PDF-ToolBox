import { Router } from 'express';

import { documentConvertController } from '../controllers/documentConvert.controller.js';
import { documentsController } from '../controllers/documents.controller.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import {
  singleCsvUpload,
  singleDocxUpload,
  singleExcelUpload,
  singleHtmlUpload,
  singlePptxUpload,
  singleTextUpload,
} from '../middleware/upload.js';
import { enforceUsageLimit } from '../middleware/usageLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const documentsRouter = Router();

documentsRouter.use(processingRateLimiter, enforceUsageLimit());

/**
 * Kept separate from `filesRouter`/`pdfRouter`: a source document here is a
 * different resource from the PDF this app otherwise centres around, and —
 * like images-to-PDF — there is no "open document" yet when any of these
 * run; upload and conversion happen in one request.
 */
documentsRouter.post('/to-pdf', singleDocxUpload(), asyncHandler(documentsController.toPdf));
documentsRouter.post('/excel-to-pdf', singleExcelUpload(), asyncHandler(documentConvertController.excelToPdf));
documentsRouter.post('/csv-to-pdf', singleCsvUpload(), asyncHandler(documentConvertController.csvToPdf));
documentsRouter.post('/pptx-to-pdf', singlePptxUpload(), asyncHandler(documentConvertController.pptxToPdf));
documentsRouter.post('/html-to-pdf', singleHtmlUpload(), asyncHandler(documentConvertController.htmlToPdf));
documentsRouter.post('/text-to-pdf', singleTextUpload(), asyncHandler(documentConvertController.textToPdf));
