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

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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
    `&limit=5000`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    return NextResponse.json({ error: "Error fetching data" }, { status: 500 });
  }

  const events: Array<{
    session_id: string;
    query: string;
    categories: string[];
    budget_total: number | null;
    results_count: number;
    no_stock_categories: string[];
    created_at: string;
  }> = await res.json();

  // Armar CSV
  const csvRows: string[] = [];

  // Header
  csvRows.push(
    ["Fecha", "Hora", "Búsqueda", "Categorías pedidas", "Presupuesto", "Productos encontrados", "Sin stock", "Sesión"].join(",")
  );

  for (const e of events) {
    const dt = new Date(e.created_at);
    const fecha = dt.toLocaleDateString("es-AR");
    const hora = dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

    const cats = (e.categories || [])
      .map((c) => CATEGORY_LABELS[c] || c)
      .join(" | ");

    const noStock = (e.no_stock_categories || [])
      .map((c) => CATEGORY_LABELS[c] || c)
      .join(" | ");

    csvRows.push(
      [
        escapeCSV(fecha),
        escapeCSV(hora),
        escapeCSV(e.query),
        escapeCSV(cats),
        escapeCSV(e.budget_total),
        escapeCSV(e.results_count),
        escapeCSV(noStock || "—"),
        escapeCSV(e.session_id?.slice(0, 8)),
      ].join(",")
    );
  }

  const csv = "\uFEFF" + csvRows.join("\r\n"); // BOM para que Excel lo abra bien en español
  const filename = `stockfish-${merchant}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
