import { z } from 'zod';

const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' && arg.trim() === '') return undefined;
  return arg;
}, z.coerce.date().optional());

export const createGroupSchema = z.object({
  body: z.object({
    groupName: z.string().min(3).max(100),
    groupType: z.enum(['TONTINE', 'MICRO_SAVINGS']).optional(),
    includeAdminAsMember: z.boolean().optional(),
    contributionAmount: z.number().max(10000000).optional(),
    currencyCode: z.string().length(3),
    paymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']).optional(),
    customFrequencyDays: z.number().int().min(1).max(365).optional(),
    maxMembers: z.number().int().min(1).max(100),
    payoutOrderType: z.enum(['MANUAL', 'RANDOM', 'ROTATION']).optional(),
    startDate: dateSchema,
    gracePeriodDays: z.number().int().min(0).max(30).optional(),
  }).superRefine((val, ctx) => {
    const groupType = val.groupType || 'TONTINE';

    if (groupType === 'TONTINE') {
      if (typeof val.contributionAmount !== 'number' || val.contributionAmount <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['contributionAmount'], message: 'Contribution amount must be greater than 0' });
      }
      if (!val.paymentFrequency) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['paymentFrequency'], message: 'Payment frequency is required' });
      }
      if (!val.payoutOrderType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['payoutOrderType'], message: 'Payout order type is required' });
      }
      if (typeof val.maxMembers !== 'number' || val.maxMembers < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxMembers'], message: 'Max members must be at least 3' });
      }
    }
  }),
});

export const updateGroupSchema = z.object({
  body: z.object({
    groupName: z.string().min(3).max(100).optional(),
    contributionAmount: z.number().positive().max(10000000).optional(),
    currencyCode: z.string().length(3).optional(),
    maxMembers: z.number().int().min(3).max(100).optional(),
    startDate: dateSchema,
    gracePeriodDays: z.number().int().min(0).max(30).optional(),
  }),
});

export const permanentDeleteGroupSchema = z.object({
  body: z.object({
    confirmationText: z.string().min(1),
  }),
});
