import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stockfish.ar";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.rpc("get_my_referral_stats");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats = Array.isArray(data) ? data[0] : data;
  if (!stats) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    referral_code: stats.referral_code,
    referral_count: stats.referral_count ?? 0,
    referral_link: `${appUrl}?ref=${stats.referral_code}`,
  });
}
