import { z } from 'zod';

export const updateContributionSchema = z
  .object({
    params: z.object({
      groupId: z.string().uuid(),
      contributionId: z.string().uuid(),
    }),
    body: z
      .object({
        amount: z.number().positive().optional(),
        paymentDate: z.string().datetime().optional(),
        paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER']).optional(),
        referenceNumber: z.string().max(100).optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
      .refine((b) => Object.keys(b).length > 0, { message: 'At least one field must be provided' }),
  })
  .strict();

