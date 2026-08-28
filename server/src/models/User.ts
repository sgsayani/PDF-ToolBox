import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';

/**
 * Plan ids, and the one plan that exists today. Deliberately a small, static
 * registry rather than its own collection: a plan is code (what it allows),
 * not user data. Adding a paid tier later means adding a key here and to
 * `PLAN_LIMITS` in `usage.service.ts` — no schema change, no migration.
 */
export const PLAN_IDS = ['free'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never selected by default — a query has to opt in with `.select('+passwordHash')`,
    // so a stray `User.find()` elsewhere in the app can never leak a hash.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    plan: { type: String, enum: PLAN_IDS, default: 'free', required: true },
    createdAt: { type: Date, default: Date.now },
  },
);

userSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    delete ret.__v;
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

export type UserSchema = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserSchema>;

export const User = model('User', userSchema);
