import { z } from "zod";

export const roomSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/),
  isPublic: z.boolean().default(true),
  pin: z.string().min(4).max(6).optional(),
});

export const roomUpdateSchema = roomSchema.partial();