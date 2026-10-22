import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { slideSchema } from "@/lib/slides/schema";
import { regenerateSlide, isGatewayAvailable } from "@/lib/slides/gateway";

export const runtime = "nodejs";
export const maxDuration = 30;

const regenerateRequestSchema = z.object({
  slide: slideSchema,
  context: z.object({
    prevTitle: z.string().optional(),
    nextTitle: z.string().optional(),
  }),
  hint: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = regenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { slide, context, hint } = parsed.data;

  if (!isGatewayAvailable()) {
    return NextResponse.json(slide);
  }

  try {
    const newSlide = await regenerateSlide(slide, context, hint, request.signal);

    if (newSlide) {
      return NextResponse.json(newSlide);
    }

    return NextResponse.json(slide);
  } catch (error) {
    console.error("Regeneration error:", error);
    return NextResponse.json(slide);
  }
}
