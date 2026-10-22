import { z } from "zod";

export const slideImageSchema = z.object({
  url: z.string().url(),
  prompt: z.string().optional(),
  source: z.literal("higgsfield").optional(),
});

export const titleSlideSchema = z.object({
  id: z.string(),
  type: z.literal("title"),
  title: z.string().max(80),
  subtitle: z.string().max(120).optional(),
  notes: z.string().optional(),
  image: slideImageSchema.optional(),
  imagePrompt: z.string().optional(),
});

export const bulletsSlideSchema = z.object({
  id: z.string(),
  type: z.literal("bullets"),
  title: z.string().max(80),
  bullets: z.array(z.string().max(90)).min(1).max(6),
  notes: z.string().optional(),
  image: slideImageSchema.optional(),
  imagePrompt: z.string().optional(),
});

export const quoteSlideSchema = z.object({
  id: z.string(),
  type: z.literal("quote"),
  quote: z.string().max(200),
  author: z.string().max(50).optional(),
  notes: z.string().optional(),
  image: slideImageSchema.optional(),
  imagePrompt: z.string().optional(),
});

export const statItemSchema = z.object({
  value: z.string().max(20),
  label: z.string().max(50),
});

export const statsSlideSchema = z.object({
  id: z.string(),
  type: z.literal("stats"),
  title: z.string().max(80).optional(),
  stats: z.array(statItemSchema).min(2).max(4),
  notes: z.string().optional(),
  image: slideImageSchema.optional(),
  imagePrompt: z.string().optional(),
});

export const columnSchema = z.object({
  heading: z.string().max(40),
  bullets: z.array(z.string().max(90)).min(1).max(4),
});

export const twoColumnsSlideSchema = z.object({
  id: z.string(),
  type: z.literal("two_columns"),
  title: z.string().max(80),
  left: columnSchema,
  right: columnSchema,
  notes: z.string().optional(),
  image: slideImageSchema.optional(),
  imagePrompt: z.string().optional(),
});

export const summarySlideSchema = z.object({
  id: z.string(),
  type: z.literal("summary"),
  title: z.string().max(80),
  bullets: z.array(z.string().max(90)).min(1).max(5),
  cta: z.string().max(60).optional(),
  notes: z.string().optional(),
  image: slideImageSchema.optional(),
  imagePrompt: z.string().optional(),
});

export const slideSchema = z.discriminatedUnion("type", [
  titleSlideSchema,
  bulletsSlideSchema,
  quoteSlideSchema,
  statsSlideSchema,
  twoColumnsSlideSchema,
  summarySlideSchema,
]);

export const themeSchema = z.enum(["clean", "midnight", "bold"]);
export const languageSchema = z.enum(["auto", "ru", "en"]);
export const toneSchema = z.enum(["business", "friendly", "inspiring", "academic"]);

export const presentationSchema = z.object({
  version: z.literal(1),
  title: z.string().max(100),
  language: languageSchema,
  theme: themeSchema,
  slides: z.array(slideSchema).min(1),
});

export const generateSettingsSchema = z.object({
  text: z.string().min(50).max(30000),
  slideCount: z.union([z.literal("auto"), z.number().min(3).max(20)]),
  language: languageSchema,
  tone: toneSchema,
  theme: themeSchema,
});

export type SlideImage = z.infer<typeof slideImageSchema>;
export type TitleSlide = z.infer<typeof titleSlideSchema>;
export type BulletsSlide = z.infer<typeof bulletsSlideSchema>;
export type QuoteSlide = z.infer<typeof quoteSlideSchema>;
export type StatsSlide = z.infer<typeof statsSlideSchema>;
export type TwoColumnsSlide = z.infer<typeof twoColumnsSlideSchema>;
export type SummarySlide = z.infer<typeof summarySlideSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Tone = z.infer<typeof toneSchema>;
export type Presentation = z.infer<typeof presentationSchema>;
export type GenerateSettings = z.infer<typeof generateSettingsSchema>;
