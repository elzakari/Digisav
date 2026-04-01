import { z } from 'zod';

export const adjustPayoutSchema = z
  .object({
    params: z.object({
      groupId: z.string().uuid(),
      transactionId: z.string().uuid(),
    }),
    body: z
      .object({
        amount: z.number().positive().optional(),
        paymentMethod: z.string().min(1).max(50).optional(),
        referenceNumber: z.string().max(100).optional().nullable().or(z.literal('')),
        notes: z.string().max(1000).optional().nullable().or(z.literal('')),
        paymentDate: z.string().datetime().optional(),
      })
      .refine((b) => Object.keys(b).length > 0, { message: 'At least one field must be provided' }),
  });

