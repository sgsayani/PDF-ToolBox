import { Router } from 'express';

import { accountController } from '../controllers/account.controller.js';
import { requireAuth, requireDatabase } from '../middleware/auth.js';
import { processingRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { saveFileSchema } from '../validators/auth.validators.js';

/**
 * Everything here is a signed-in user's own data. `requireAuth` guarantees
 * `req.user`; every controller then scopes its query to `req.user.id`, so a
 * client can never read or delete another account's history or files by
 * guessing an id.
 */
export const accountRouter = Router();

accountRouter.use(requireDatabase, requireAuth);

accountRouter.get('/usage', asyncHandler(accountController.usage));

accountRouter.get('/history', asyncHandler(accountController.history));
accountRouter.delete('/history/:id', asyncHandler(accountController.deleteHistoryEntry));
accountRouter.delete('/history', asyncHandler(accountController.clearHistory));

accountRouter.get('/saved-files', asyncHandler(accountController.listSavedFiles));
// Copying a working file into permanent storage is a processing-adjacent
// action, so it shares the same rate limit as the tools that produce it.
accountRouter.post(
  '/saved-files',
  processingRateLimiter,
  validateBody(saveFileSchema),
  asyncHandler(accountController.saveFile),
);
accountRouter.get('/saved-files/:id/download', asyncHandler(accountController.downloadSavedFile));
accountRouter.delete('/saved-files/:id', asyncHandler(accountController.deleteSavedFile));
