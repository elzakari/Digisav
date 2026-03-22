import { z } from 'zod';

const dateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' && arg.trim() === '') return undefined;
  return arg;
}, z.coerce.date().optional());

export const createGroupSchema = z.object({
  body: z.object({
    groupName: z.string().min(3).max(100),
    contributionAmount: z.number().positive().max(10000000),
    currencyCode: z.string().length(3),
    paymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
    customFrequencyDays: z.number().int().min(1).max(365).optional(),
    maxMembers: z.number().int().min(3).max(100),
    payoutOrderType: z.enum(['MANUAL', 'RANDOM', 'ROTATION']),
    startDate: dateSchema,
    gracePeriodDays: z.number().int().min(0).max(30).optional(),
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
