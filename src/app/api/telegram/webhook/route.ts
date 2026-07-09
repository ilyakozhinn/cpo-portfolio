import { NextResponse } from "next/server";
import {
  handleTelegramUpdate,
  type TelegramUpdate,
} from "@/lib/telegram";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
