import { streamObject } from "ai";
import { z } from "zod";
import {
  slideSchema,
  presentationSchema,
  type GenerateSettings,
  type Slide,
} from "./schema";
import { buildSystemPrompt, buildUserPrompt, buildRegeneratePrompt } from "./prompts";

const SLIDES_MODEL = process.env.SLIDES_MODEL || "openai/gpt-4o-mini";
const SLIDES_FALLBACK_MODEL = process.env.SLIDES_FALLBACK_MODEL || "anthropic/claude-haiku-4.5";

function isGatewayAvailable(): boolean {
  return !!(
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.VERCEL
  );
}

export async function* generatePresentationStream(
  settings: GenerateSettings,
  signal?: AbortSignal
): AsyncGenerator<{ type: "slide" | "done" | "error"; data?: Slide; error?: string }> {
  if (!isGatewayAvailable()) {
    yield { type: "error", error: "AI Gateway not available" };
    return;
  }

  const systemPrompt = buildSystemPrompt(settings.language, settings.tone);
  const userPrompt = buildUserPrompt(settings.text, settings.slideCount, settings.tone);

  const outputSchema = z.object({
    title: z.string(),
    slides: z.array(slideSchema),
  });

  let model = SLIDES_MODEL;
  let retried = false;

  while (true) {
    try {
      const result = streamObject({
        model,
        schema: outputSchema,
        system: systemPrompt,
        prompt: userPrompt,
        abortSignal: signal,
      });

      let lastSlideCount = 0;

      for await (const partial of result.partialObjectStream) {
        if (partial.slides && partial.slides.length > lastSlideCount) {
          for (let i = lastSlideCount; i < partial.slides.length; i++) {
            const slide = partial.slides[i];
            if (slide && slide.id && slide.type) {
              yield { type: "slide", data: slide as Slide };
            }
          }
          lastSlideCount = partial.slides.length;
        }
      }

      yield { type: "done" };
      return;
    } catch (error) {
      if (signal?.aborted) {
        yield { type: "error", error: "Cancelled" };
        return;
      }

      if (!retried && model !== SLIDES_FALLBACK_MODEL) {
        model = SLIDES_FALLBACK_MODEL;
        retried = true;
        continue;
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      yield { type: "error", error: message };
      return;
    }
  }
}

export async function regenerateSlide(
  currentSlide: Slide,
  context: { prevTitle?: string; nextTitle?: string },
  hint?: string,
  signal?: AbortSignal
): Promise<Slide | null> {
  if (!isGatewayAvailable()) {
    return null;
  }

  const prompt = buildRegeneratePrompt(
    JSON.stringify(currentSlide),
    context,
    hint
  );

  try {
    const result = streamObject({
      model: SLIDES_MODEL,
      schema: slideSchema,
      prompt,
      abortSignal: signal,
    });

    const final = await result.object;
    return { ...final, id: currentSlide.id };
  } catch {
    return null;
  }
}

export { isGatewayAvailable };
