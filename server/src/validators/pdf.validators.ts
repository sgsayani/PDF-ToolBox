import { z } from 'zod';

import { env } from '../config/env.js';
import { COMPRESSION_LEVELS } from '../services/compress.service.js';
import { OCR_LANGUAGES } from '../services/ocr.service.js';
import { POSITION_PRESETS } from '../services/pdf.service.js';
import { TRANSLATE_LANGUAGES } from '../services/translation.service.js';

/** Opaque storage id: 16 random bytes, hex encoded. */
export const fileIdSchema = z
  .string()
  .regex(/^[a-f0-9]{32}$/, 'This file reference is not valid.');

/**
 * Upper bound on how many page numbers a request may carry. Generous for real
 * documents, but stops a client from sending an unbounded array.
 */
const MAX_PAGE_ENTRIES = 10_000;

const pageNumberSchema = z
  .number({ invalid_type_error: 'Page numbers must be whole numbers.' })
  .int('Page numbers must be whole numbers.')
  .positive('Page numbers start at 1.')
  .max(MAX_PAGE_ENTRIES, 'That page number is out of range.');


/**
 * A complete page plan: which source pages to keep, in what order, and how far
 * each is turned. Deleting a page means leaving it out; reordering means
 * changing the sequence. Expressing all three together lets a whole editing
 * session commit as one atomic operation.
 */
const pagePlanSchema = z
  .array(
    z.object({
      source: pageNumberSchema,
      rotate: z
        .number()
        .int()
        .multipleOf(90, 'Pages can only be rotated in quarter turns.')
        .min(-360)
        .max(360)
        .default(0),
    }),
  )
  .min(1, 'A PDF must keep at least one page.')
  .max(MAX_PAGE_ENTRIES, 'Too many pages were selected.');

/** Applies a page plan in place of the document's current pages. */
export const organizeSchema = z.object({
  fileId: fileIdSchema,
  pages: pagePlanSchema,
});

/**
 * Extracts a subset of pages into a new document. Structurally the same
 * request as `organize`; kept separate because it is a distinct user
 * intention, which shapes the output filename and the recorded history.
 */
export const splitSchema = z.object({
  fileId: fileIdSchema,
  pages: pagePlanSchema,
});

export const mergeSchema = z.object({
  fileIds: z
    .array(fileIdSchema)
    .min(2, 'Select at least two PDFs to merge.')
    .max(env.MAX_FILES_PER_REQUEST, `You can merge up to ${env.MAX_FILES_PER_REQUEST} files at once.`),
});

export const fileIdParamSchema = z.object({ id: fileIdSchema });

/** Which pages an effect (watermark, page numbers) applies to. */
const applyToPagesSchema = z.union([z.literal('all'), z.array(pageNumberSchema).min(1, 'Select at least one page.')]);

const positionPresetSchema = z.enum(POSITION_PRESETS, {
  errorMap: () => ({ message: 'Choose a position on the page.' }),
});

/** Page numbers read naturally along a page's top or bottom edge only. */
const pageNumberPositionSchema = z.enum(
  ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'],
  { errorMap: () => ({ message: 'Choose a position on the page.' }) },
);

export const watermarkSchema = z.object({
  fileId: fileIdSchema,
  text: z
    .string()
    .trim()
    .min(1, 'Enter the watermark text.')
    .max(200, 'Keep the watermark text under 200 characters.'),
  position: positionPresetSchema.default('center'),
  opacity: z.number().min(0.05, 'Opacity must be at least 5%.').max(1).default(0.3),
  fontSize: z.number().int().min(8, 'Font size must be at least 8.').max(200).default(48),
  pages: applyToPagesSchema.default('all'),
});

export const pageNumbersSchema = z.object({
  fileId: fileIdSchema,
  position: pageNumberPositionSchema.default('bottom-center'),
  startNumber: z
    .number()
    .int('Start number must be a whole number.')
    .min(1, 'Start number must be at least 1.')
    .max(100_000, 'That start number is too large.')
    .default(1),
  pages: applyToPagesSchema.default('all'),
});

export const removeMetadataSchema = z.object({
  fileId: fileIdSchema,
});

/** A little over 2 MB of base64, matching the service's decoded-size cap. */
const MAX_SIGNATURE_DATA_URL_LENGTH = 2_800_000;

export const signSchema = z.object({
  fileId: fileIdSchema,
  page: pageNumberSchema,
  position: positionPresetSchema.default('bottom-right'),
  widthPercent: z
    .number()
    .min(10, 'Signature must be at least 10% of the page width.')
    .max(60, 'Signature can be at most 60% of the page width.')
    .default(30),
  image: z
    .string()
    .min(1, 'Draw a signature first.')
    .max(MAX_SIGNATURE_DATA_URL_LENGTH, 'That signature image is too large.')
    .regex(/^data:image\/png;base64,/, 'The signature must be a PNG image.'),
});

export const protectSchema = z.object({
  fileId: fileIdSchema,
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters.')
    .max(128, 'Password must be at most 128 characters.'),
});

export const metadataParamSchema = fileIdParamSchema;

/** Extracts the chosen pages as JPEGs, individually and (if more than one) as a ZIP. */
export const toJpgSchema = z.object({
  fileId: fileIdSchema,
  pages: applyToPagesSchema.default('all'),
});

export const toWordSchema = z.object({
  fileId: fileIdSchema,
});

export const imagesToPdfSchema = z.object({
  fileIds: z
    .array(fileIdSchema)
    .min(1, 'Add at least one image.')
    .max(env.MAX_FILES_PER_REQUEST, `You can convert up to ${env.MAX_FILES_PER_REQUEST} images at once.`),
});

/** One field's submitted value: text (string), a checkbox (boolean), or a radio/dropdown/list selection. */
const formFieldValueSchema = z.object({
  name: z.string().min(1).max(300),
  value: z.union([z.string().max(10_000), z.boolean(), z.array(z.string().max(1000)).max(200)]),
});

export const fillFormSchema = z.object({
  fileId: fileIdSchema,
  values: z.array(formFieldValueSchema).max(1000, 'Too many fields were submitted.'),
});

/**
 * The password field carried alongside a multipart file upload for
 * remove-password. Unlike `protectSchema` (which sets a *new* password,
 * where a minimum length is a sane default), this is verifying a password
 * that already exists and could be any length or shape, so only a sanity
 * cap applies.
 */
export const removePasswordFieldsSchema = z.object({
  password: z.string().min(1, 'Enter the password.').max(128, 'That password is too long.'),
});

export const ocrSchema = z.object({
  fileId: fileIdSchema,
  pages: applyToPagesSchema.default('all'),
  language: z.enum(OCR_LANGUAGES, { errorMap: () => ({ message: 'Choose a supported language.' }) }).default('eng'),
  generateSearchablePdf: z.boolean().default(true),
});

export const compressSchema = z.object({
  fileId: fileIdSchema,
  level: z.enum(COMPRESSION_LEVELS, { errorMap: () => ({ message: 'Choose a compression level.' }) }),
});

/** A fraction of the page's width or height, measured from the top-left corner. */
const fractionSchema = z.number().min(0).max(1);

const rectSchema = z.object({
  xFraction: fractionSchema,
  yFraction: fractionSchema,
  widthFraction: fractionSchema.refine((value) => value > 0, 'The crop area is too small.'),
  heightFraction: fractionSchema.refine((value) => value > 0, 'The crop area is too small.'),
});

export const cropSchema = z.object({
  fileId: fileIdSchema,
  pages: applyToPagesSchema.default('all'),
  rect: rectSchema,
});

export const redactSchema = z.object({
  fileId: fileIdSchema,
  areas: z
    .array(rectSchema.extend({ page: pageNumberSchema }))
    .min(1, 'Add at least one redaction area.')
    .max(500, 'Too many redaction areas.'),
});

export const toExcelSchema = z.object({ fileId: fileIdSchema });
export const toCsvSchema = z.object({ fileId: fileIdSchema });
export const toHtmlSchema = z.object({ fileId: fileIdSchema });
export const toPptxSchema = z.object({ fileId: fileIdSchema });

export const translateSchema = z.object({
  fileId: fileIdSchema,
  targetLang: z.enum(TRANSLATE_LANGUAGES, { errorMap: () => ({ message: 'Choose a target language.' }) }),
  // Omitted entirely lets DeepL auto-detect — not `.default()`, since "no
  // preference" and "detect" are the same thing here, not a fallback value.
  sourceLang: z.enum(TRANSLATE_LANGUAGES).optional(),
});

export const scannerCleanupSchema = z.object({
  fileId: fileIdSchema,
  pages: applyToPagesSchema.default('all'),
  grayscale: z.boolean().default(false),
  brightness: z.number().int().min(-100).max(100).default(0),
  contrast: z.number().int().min(-100).max(100).default(0),
  rotate: z.number().min(-15).max(15).default(0),
  denoise: z.boolean().default(false),
  cleanBackground: z.boolean().default(false),
});

export type OrganizeInput = z.infer<typeof organizeSchema>;
export type SplitInput = z.infer<typeof splitSchema>;
export type MergeInput = z.infer<typeof mergeSchema>;
export type WatermarkInput = z.infer<typeof watermarkSchema>;
export type PageNumbersInput = z.infer<typeof pageNumbersSchema>;
export type RemoveMetadataInput = z.infer<typeof removeMetadataSchema>;
export type SignInput = z.infer<typeof signSchema>;
export type ProtectInput = z.infer<typeof protectSchema>;
export type ToJpgInput = z.infer<typeof toJpgSchema>;
export type ToWordInput = z.infer<typeof toWordSchema>;
export type ImagesToPdfInput = z.infer<typeof imagesToPdfSchema>;
export type FillFormInput = z.infer<typeof fillFormSchema>;
export type RemovePasswordFieldsInput = z.infer<typeof removePasswordFieldsSchema>;
export type OcrInput = z.infer<typeof ocrSchema>;
export type ScannerCleanupInput = z.infer<typeof scannerCleanupSchema>;
export type CompressInput = z.infer<typeof compressSchema>;
export type CropInput = z.infer<typeof cropSchema>;
export type RedactInput = z.infer<typeof redactSchema>;
export type TranslateInput = z.infer<typeof translateSchema>;
export type ToExcelInput = z.infer<typeof toExcelSchema>;
export type ToCsvInput = z.infer<typeof toCsvSchema>;
export type ToHtmlInput = z.infer<typeof toHtmlSchema>;
export type ToPptxInput = z.infer<typeof toPptxSchema>;
