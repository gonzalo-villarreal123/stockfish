"use client";

import { useState, useEffect, useRef } from "react";

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL || "http://localhost:8000";

type Step = "form" | "processing" | "done" | "error";

type StatusData = {
  status: string;
  products_found: number;
  products_added: number;
  merchant_slug: string;
  completed_at?: string;
  error?: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        background: copied ? "#1a3a1a" : "#1a1a1a",
        border: `1px solid ${copied ? "#2a6a2a" : "#333"}`,
        color: copied ? "#6ee36e" : "#aaa",
        fontSize: 12,
        padding: "6px 16px",
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
        fontFamily: "inherit",
      }}
    >
      {copied ? "¡Copiado!" : "Copiar snippet"}
    </button>
  );
}

export default function AltaPage() {
  const [step, setStep] = useState<Step>("form");
  const [storeUrl, setStoreUrl] = useState("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState("");
  const [snippet, setSnippet] = useState("");
  const [status, setStatus] = useState<StatusData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling de estado del scraper
  useEffect(() => {
    if (step !== "processing" || !slug) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${AGENTS_URL}/onboard/status/${slug}`);
        const data: StatusData = await res.json();
        setStatus(data);

        if (data.status === "completed") {
          clearInterval(pollRef.current!);
          setStep("done");
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setError(data.error || "Error en el scraping");
          setStep("error");
        }
      } catch {
        // silencioso, reintenta en próximo tick
      }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeUrl.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${AGENTS_URL}/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_url: storeUrl.trim(),
          name: storeName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al registrar la tienda");
      }

      const data = await res.json();
      setSlug(data.merchant_slug);
      setSnippet(data.embed_snippet);
      setStep("done"); // el merchant se crea en Supabase; scraping es local
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#fff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Stockfish</div>
          <div style={{ fontSize: 14, color: "#555" }}>Alta de nueva tienda</div>
        </div>

        {/* ── FORM ── */}
        {step === "form" && (
          <form onSubmit={handleSubmit}>
            <div style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 16,
              padding: 28,
            }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  URL de la tienda *
                </label>
                <input
                  type="text"
                  value={storeUrl}
                  onChange={e => setStoreUrl(e.target.value)}
                  placeholder="mititienda.mitiendanube.com"
                  required
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>
                  Tienda Nube AR. También acepta dominios propios.
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Nombre de la tienda (opcional)
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder="Ej: Garbo Home"
                  style={{
                    width: "100%",
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: 10,
                    padding: "10px 14px",
                    color: "#fff",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {error && (
                <div style={{
                  background: "#2a0a0a",
                  border: "1px solid #5a1a1a",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#ff6b6b",
                  marginBottom: 20,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !storeUrl.trim()}
                style={{
                  width: "100%",
                  background: loading || !storeUrl.trim() ? "#1a1a1a" : "#fff",
                  color: loading || !storeUrl.trim() ? "#444" : "#000",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading || !storeUrl.trim() ? "default" : "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
              >
                {loading ? "Registrando..." : "Dar de alta →"}
              </button>
            </div>
          </form>
        )}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <div style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 16,
            padding: 28,
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
                Procesando catálogo de <strong style={{ color: "#fff" }}>{slug}</strong>
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                Esto puede tardar unos minutos según el tamaño del catálogo.
              </div>
            </div>

            {/* Barra de progreso animada */}
            <div style={{
              background: "#1a1a1a",
              borderRadius: 6,
              height: 6,
              marginBottom: 20,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                background: "linear-gradient(90deg, #6c63ff, #22c55e)",
                borderRadius: 6,
                animation: "progress 2s ease-in-out infinite",
                width: status?.products_found ? `${Math.min((status.products_added / Math.max(status.products_found, 1)) * 100, 95)}%` : "30%",
                transition: "width 0.5s ease",
              }} />
            </div>
            <style>{`
              @keyframes progress {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
            `}</style>

            {status && status.products_found > 0 && (
              <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
                {status.products_added} de {status.products_found} productos procesados
              </div>
            )}
            {(!status || status.products_found === 0) && (
              <div style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>
                Detectando productos del catálogo...
              </div>
            )}

            {/* Snippet disponible desde el inicio */}
            <div style={{
              background: "#0d0d0d",
              border: "1px solid #1e1e1e",
              borderRadius: 10,
              padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Snippet de embed
                </span>
                <CopyButton text={snippet} />
              </div>
              <pre style={{
                fontSize: 11,
                color: "#555",
                margin: 0,
                overflow: "auto",
                lineHeight: 1.5,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}>
                {snippet}
              </pre>
              <div style={{ fontSize: 11, color: "#444", marginTop: 10 }}>
                Pegá esto en tu tienda Tienda Nube → Personalización → HTML adicional (pie de página)
              </div>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 16,
            padding: 28,
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                ¡Listo! 🎉
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>
                <strong style={{ color: "#fff" }}>{slug}</strong> está activo con{" "}
                <strong style={{ color: "#22c55e" }}>{status?.products_added || 0} productos</strong> indexados.
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Productos indexados", value: status?.products_added || 0 },
                { label: "Widget URL", value: `focobusiness.com/widget/${slug}` },
              ].map((item) => (
                <div key={item.label} style={{
                  flex: 1,
                  background: "#0d0d0d",
                  border: "1px solid #1e1e1e",
                  borderRadius: 10,
                  padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", wordBreak: "break-all" }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Snippet */}
            <div style={{
              background: "#0d0d0d",
              border: "1px solid #1e1e1e",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Snippet de embed
                </span>
                <CopyButton text={snippet} />
              </div>
              <pre style={{
                fontSize: 11,
                color: "#555",
                margin: 0,
                overflow: "auto",
                lineHeight: 1.5,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}>
                {snippet}
              </pre>
            </div>

            {/* Comando local para scraping */}
            <div style={{
              background: "#0d0d0d",
              border: "1px solid #1e1e1e",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>
                Paso 2 — Indexar el catálogo (correr localmente en la terminal)
              </div>
              <pre style={{
                fontSize: 12,
                color: "#aaa",
                margin: 0,
                fontFamily: "'SF Mono', 'Fira Code', monospace",
              }}>
                {`python scraper.py --url ${storeUrl}`}
              </pre>
            </div>

            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.6 }}>
              <strong style={{ color: "#666" }}>Cómo activar el widget:</strong><br />
              Tienda Nube → Personalización → Editar HTML → Pie de página → pegá el snippet → Guardar.
            </div>

            <button
              onClick={() => { setStep("form"); setStoreUrl(""); setStoreName(""); setSlug(""); setStatus(null); }}
              style={{
                marginTop: 20,
                background: "none",
                border: "1px solid #2a2a2a",
                color: "#555",
                borderRadius: 10,
                padding: "8px 20px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Dar de alta otra tienda
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <div style={{
            background: "#111",
            border: "1px solid #2a0a0a",
            borderRadius: 16,
            padding: 28,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#ff6b6b", marginBottom: 8 }}>
              Error en el scraping
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>{error}</div>
            <button
              onClick={() => setStep("form")}
              style={{
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: 10,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
