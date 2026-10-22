import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateImage,
  isHiggsFieldAvailable,
  isHiggsFieldError,
} from "@/lib/slides/higgsfield";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_RATE_LIMIT_WINDOW = 3600000;
const IMAGE_RATE_LIMIT_MAX = 5;
const ipImageCounts = new Map<string, { count: number; resetAt: number }>();

function checkImageRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipImageCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    ipImageCounts.set(ip, { count: 1, resetAt: now + IMAGE_RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= IMAGE_RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

const imageRequestSchema = z.object({
  prompt: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!isHiggsFieldAvailable()) {
    return NextResponse.json(
      {
        error: "Image generation not available",
        details: "HIGGSFIELD_API_KEY is not configured",
      },
      { status: 503 }
    );
  }

  if (!checkImageRateLimit(ip)) {
    return NextResponse.json(
      {
        error: "Image rate limit exceeded",
        details: "Maximum 5 images per hour. Try again later.",
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = imageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { prompt } = parsed.data;

  try {
    const result = await generateImage(prompt, request.signal);

    if (isHiggsFieldError(result)) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
        },
        { status: result.code === "no_key" ? 503 : 500 }
      );
    }

    return NextResponse.json({
      url: result.url,
      prompt: result.prompt,
      source: result.source,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        error: "Image generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
