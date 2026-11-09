import { z } from 'zod';

export const fileQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  status: z.enum(['ALL', 'QUEUED', 'PROCESSING', 'EXTRACTING', 'COMPLETED', 'FAILED']).optional().default('ALL'),
  search: z.string().trim().optional().default(''),
});

