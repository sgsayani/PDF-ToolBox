import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254, 'That email address is too long.');

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be at most 128 characters.'),
  name: z.string().trim().min(1, 'Enter your name.').max(120, 'That name is too long.'),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Deliberately no minimum here: an account created before a policy change
  // could have a shorter password, and login should still be able to say
  // "wrong password" for it rather than reject the request outright.
  password: z.string().min(1, 'Enter your password.').max(128, 'That password is too long.'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120, 'That name is too long.'),
});

export const saveFileSchema = z.object({
  fileId: z.string().regex(/^[a-f0-9]{32}$/, 'This file reference is not valid.'),
});

/** Matches a Mongo ObjectId — used for both history entries and saved files. */
export const mongoIdParamSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/, 'That reference is not valid.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SaveFileInput = z.infer<typeof saveFileSchema>;
export type MongoIdParam = z.infer<typeof mongoIdParamSchema>;
