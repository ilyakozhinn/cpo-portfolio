import { NextRequest, NextResponse } from "next/server";
import { generateSettingsSchema } from "@/lib/slides/schema";
import { parseTextToSlides } from "@/lib/slides/fallback";
import { generatePresentationStream, isGatewayAvailable } from "@/lib/slides/gateway";

export const runtime = "nodejs";
export const maxDuration = 60;

const RATE_LIMIT_WINDOW = 3600000;
const RATE_LIMIT_MAX = 10;
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in an hour." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = generateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const settings = parsed.data;

  if (!isGatewayAvailable()) {
    const presentation = parseTextToSlides(settings);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const slide of presentation.slides) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "slide",
                data: slide,
                total: presentation.slides.length,
              }) + "\n"
            )
          );
        }
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "done", mode: "rule_based" }) + "\n"
          )
        );
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const signal = request.signal;
        let mode: "gateway" | "gateway_fallback" | "rule_based" = "gateway";

        for await (const event of generatePresentationStream(settings, signal)) {
          if (event.type === "slide" && event.data) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "slide",
                  data: event.data,
                }) + "\n"
              )
            );
          } else if (event.type === "done") {
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "done", mode }) + "\n")
            );
          } else if (event.type === "error") {
            const fallbackPresentation = parseTextToSlides(settings);
            mode = "rule_based";

            for (const slide of fallbackPresentation.slides) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "slide",
                    data: slide,
                    total: fallbackPresentation.slides.length,
                  }) + "\n"
                )
              );
            }

            controller.enqueue(
              encoder.encode(JSON.stringify({ type: "done", mode }) + "\n")
            );
          }
        }
      } catch {
        const fallbackPresentation = parseTextToSlides(settings);

        for (const slide of fallbackPresentation.slides) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "slide",
                data: slide,
                total: fallbackPresentation.slides.length,
              }) + "\n"
            )
          );
        }

        controller.enqueue(
          encoder.encode(JSON.stringify({ type: "done", mode: "rule_based" }) + "\n")
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
