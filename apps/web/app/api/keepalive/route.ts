import { NextResponse } from "next/server";

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL || "https://stockfish-agents.onrender.com";

export async function GET() {
  try {
    const res = await fetch(`${AGENTS_URL}/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json({ ok: true, backend: data, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
