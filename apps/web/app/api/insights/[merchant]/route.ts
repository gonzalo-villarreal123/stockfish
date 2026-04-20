import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_REST_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const CATEGORY_LABELS: Record<string, string> = {
  lampara: "Iluminación",
  mueble: "Muebles",
  textil: "Textiles",
  cuadro: "Arte",
  florero: "Decoración",
  escultura: "Decoración",
  espejo: "Espejos",
  planta: "Plantas",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ merchant: string }> }
) {
  const { merchant } = await params;
  const days = parseInt(req.nextUrl.searchParams.get("days") || "30");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const headers: Record<string, string> = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
  };

  const url =
    `${SUPABASE_URL}/rest/v1/search_events` +
    `?merchant_slug=eq.${merchant}` +
    `&created_at=gte.${since.toISOString()}` +
    `&order=created_at.desc` +
    `&limit=1000`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  }

  const events: Array<{
    session_id: string;
    query: string;
    categories: string[];
    category_groups: string[];
    budget_total: number | null;
    results_count: number;
    no_stock_categories: string[];
    created_at: string;
  }> = await res.json();

  // ── Métricas base ──────────────────────────────────────────
  const totalSearches = events.length;
  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;

  const budgets = events
    .filter((e) => e.budget_total != null)
    .map((e) => e.budget_total as number);
  const avgBudget =
    budgets.length > 0
      ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
      : null;

  const noStockCount = events.filter(
    (e) => e.no_stock_categories?.length > 0
  ).length;
  const noStockRate =
    totalSearches > 0 ? Math.round((noStockCount / totalSearches) * 100) : 0;

  // ── Top queries ────────────────────────────────────────────
  const queryCounts: Record<string, number> = {};
  events.forEach((e) => {
    const q = (e.query || "").toLowerCase().trim();
    if (q) queryCounts[q] = (queryCounts[q] || 0) + 1;
  });
  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // ── Top categorías ─────────────────────────────────────────
  const catCounts: Record<string, number> = {};
  events.forEach((e) => {
    (e.categories || []).forEach((cat) => {
      const label = CATEGORY_LABELS[cat] || cat;
      catCounts[label] = (catCounts[label] || 0) + 1;
    });
  });
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // ── Búsquedas por día ──────────────────────────────────────
  const dayMap: Record<string, number> = {};
  events.forEach((e) => {
    const day = e.created_at.slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  });
  const byDay = Object.entries(dayMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // ── No-stock gaps ──────────────────────────────────────────
  const gapCounts: Record<string, number> = {};
  events.forEach((e) => {
    (e.no_stock_categories || []).forEach((cat) => {
      const label = CATEGORY_LABELS[cat] || cat;
      gapCounts[label] = (gapCounts[label] || 0) + 1;
    });
  });
  const stockGaps = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  return NextResponse.json({
    merchant,
    days,
    totalSearches,
    uniqueSessions,
    avgBudget,
    noStockRate,
    topQueries,
    topCategories,
    byDay,
    stockGaps,
  });
}
