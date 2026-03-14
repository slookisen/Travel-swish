import { z } from 'zod';
import { DIMS } from './types';

const ModeSchema = z.enum(['experiences', 'restaurants']);

const DimIdSchema = z.enum(DIMS);

const DimsSchema = z
  .record(z.number())
  .superRefine((obj, ctx) => {
    for (const [k, v] of Object.entries(obj)) {
      const okKey = (DIMS as readonly string[]).includes(k);
      if (!okKey) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown dim: ${k}` });
        continue;
      }
      if (!Number.isFinite(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Non-finite dim value for ${k}` });
        continue;
      }
      if (v < -1.2 || v > 1.2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Dim ${k} out of expected range (-1..1): ${v}` });
      }
    }
  });

export const CardEntrySchema = z.object({
  id: z.string().min(1),
  emoji: z.string().min(1),
  modes: z.array(ModeSchema).min(1),
  cat: z.string().min(1),
  qKey: z.string().min(1),
  descKey: z.string().min(1),
  dims: DimsSchema,
  facets: z
    .array(
      z.object({
        facetId: z.string().min(1),
        valueId: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
  tags: z.array(z.string()).optional(),
});

export const CardsFileSchema = z.object({
  version: z.string().min(1),
  cards: z.array(CardEntrySchema),
});

export const DeckSchema = z.object({
  id: z.string().min(1),
  mode: ModeSchema,
  nameKey: z.string().min(1),
  cardIds: z.array(z.string().min(1)).min(1),
});

export const DeckFileSchema = z.object({
  version: z.string().min(1),
  decks: z.array(DeckSchema),
});

export type CardEntrySchemaType = z.infer<typeof CardEntrySchema>;
export type DeckSchemaType = z.infer<typeof DeckSchema>;
