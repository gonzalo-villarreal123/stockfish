"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type InsightsData = {
  merchant: string;
  days: number;
  totalSearches: number;
  uniqueSessions: number;
  avgBudget: number | null;
  noStockRate: number;
  topQueries: { query: string; count: number }[];
  topCategories: { category: string; count: number }[];
  byDay: { date: string; count: number }[];
  stockGaps: { category: string; count: number }[];
};

const PERIOD_OPTIONS = [
  { label: "7 días", value: 7 },
  { label: "30 días", value: 30 },
  { label: "Todo", value: 365 },
];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        flex: 1,
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 4,
          color: "#333",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
          {label}
        </span>
        <span style={{ fontWeight: 600, color: "#111", flexShrink: 0 }}>{count}</span>
      </div>
      <div style={{ background: "#f0f0f0", borderRadius: 4, height: 6 }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function MiniChart({ byDay }: { byDay: { date: string; count: number }[] }) {
  if (byDay.length === 0) return null;
  const max = Math.max(...byDay.map((d) => d.count));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
      {byDay.map(({ date, count }) => {
        const h = max > 0 ? (count / max) * 60 : 2;
        const d = new Date(date + "T12:00:00Z");
        const label = d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
        return (
          <div
            key={date}
            title={`${label}: ${count} búsqueda${count !== 1 ? "s" : ""}`}
            style={{
              flex: 1,
              height: Math.max(h, 2),
              background: "#6c63ff",
              borderRadius: "3px 3px 0 0",
              cursor: "default",
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

export default function InsightsPage() {
  const params = useParams();
  const merchant = params.merchant as string;
  const [days, setDays] = useState(30);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/insights/${merchant}/export?days=${days}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stockfish-${merchant}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/insights/${merchant}?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar datos");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [merchant, days]);

  const maxQueries = data?.topQueries[0]?.count ?? 1;
  const maxCats = data?.topCategories[0]?.count ?? 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f6f8",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ background: "#111", padding: "24px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              Stockfish Insights
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>
              {merchant}
            </div>
          </div>
          {/* Period selector + export */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  background: days === opt.value ? "#6c63ff" : "#222",
                  color: days === opt.value ? "#fff" : "#888",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={handleExport}
              disabled={exporting || !data}
              style={{
                marginLeft: 8,
                padding: "6px 16px",
                borderRadius: 20,
                border: "1px solid #333",
                cursor: exporting || !data ? "default" : "pointer",
                fontSize: 13,
                fontWeight: 500,
                background: "transparent",
                color: exporting || !data ? "#555" : "#ccc",
                transition: "all 0.15s",
              }}
            >
              {exporting ? "Exportando..." : "↓ Exportar CSV"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#888", padding: 60, fontSize: 14 }}>
            Cargando datos...
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", color: "#e55", padding: 60, fontSize: 14 }}>
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Stat cards */}
            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              <StatCard
                label="Búsquedas"
                value={data.totalSearches}
                sub={`últimos ${days === 365 ? "todos los" : days} días`}
              />
              <StatCard
                label="Sesiones únicas"
                value={data.uniqueSessions}
              />
              <StatCard
                label="Presupuesto promedio"
                value={data.avgBudget != null ? `$${data.avgBudget.toLocaleString("es-AR")}` : "—"}
              />
              <StatCard
                label="Sin stock"
                value={`${data.noStockRate}%`}
                sub="búsquedas con al menos 1 categoría vacía"
              />
            </div>

            {/* Tendencia */}
            {data.byDay.length > 1 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 24px",
                  marginBottom: 20,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 16 }}>
                  Búsquedas por día
                </div>
                <MiniChart byDay={data.byDay} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#bbb" }}>
                  <span>
                    {new Date(data.byDay[0].date + "T12:00:00Z").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </span>
                  <span>
                    {new Date(data.byDay[data.byDay.length - 1].date + "T12:00:00Z").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            )}

            {/* Dos columnas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* Top queries */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 16 }}>
                  Top búsquedas
                </div>
                {data.topQueries.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#bbb" }}>Sin datos aún</div>
                ) : (
                  data.topQueries.map(({ query, count }) => (
                    <BarRow
                      key={query}
                      label={query}
                      count={count}
                      max={maxQueries}
                      color="#6c63ff"
                    />
                  ))
                )}
              </div>

              {/* Categorías */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 16 }}>
                  Categorías más pedidas
                </div>
                {data.topCategories.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#bbb" }}>Sin datos aún</div>
                ) : (
                  data.topCategories.map(({ category, count }) => (
                    <BarRow
                      key={category}
                      label={category}
                      count={count}
                      max={maxCats}
                      color="#22c55e"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Stock gaps */}
            {data.stockGaps.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  borderLeft: "4px solid #f59e0b",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 }}>
                  Oportunidades de catálogo
                </div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
                  Categorías que los clientes buscan pero no tienen stock
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {data.stockGaps.map(({ category, count }) => (
                    <div
                      key={category}
                      style={{
                        background: "#fffbeb",
                        border: "1px solid #fcd34d",
                        borderRadius: 20,
                        padding: "4px 12px",
                        fontSize: 13,
                        color: "#92400e",
                      }}
                    >
                      {category} <strong>×{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: "center", marginTop: 40, fontSize: 12, color: "#bbb" }}>
              Stockfish · datos actualizados en tiempo real
            </div>
          </>
        )}
      </div>
    </div>
  );
}
