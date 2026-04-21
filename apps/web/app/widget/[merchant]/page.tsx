"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { initPostHog, capture } from "../../../lib/posthog";

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL || "http://localhost:8000";

const CATEGORY_LABELS: Record<string, string> = {
  mueble:    "Muebles",
  textil:    "Textiles",
  lampara:   "Iluminación",
  cuadro:    "Arte",
  florero:   "Decoración",
  escultura: "Decoración",
  espejo:    "Decoración",
  planta:    "Decoración",
};

// ── Types ──────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  primary_image: string;
  url: string;
  category: string;
  merchant_slug: string;
}

interface ComboItem {
  best: Product | null;
  alternative: Product | null;
  no_stock: boolean;
}

type ComboData = Record<string, ComboItem>;

interface CategoryGroup {
  id: string;
  label: string;
  emoji: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  imagePreview?: string;
  combo?: ComboData;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/);
    return (
      <span key={i}>
        {i > 0 && <br />}
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
      </span>
    );
  });
}

// ── FeedbackInline ─────────────────────────────────────────

function FeedbackInline({
  category,
  sessionId,
  merchantSlug,
  prompt,
}: {
  category: string;
  sessionId: string;
  merchantSlug: string;
  prompt: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await fetch(`${AGENTS_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          merchant_slug: merchantSlug,
          category,
          text: text.trim(),
        }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div style={{ fontSize: 12, color: "#555", marginTop: 8, textAlign: "center" }}>
        ¡Gracias! Lo tenemos en cuenta.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          color: "#444",
          fontSize: 11,
          cursor: "pointer",
          marginTop: 8,
          padding: "2px 0",
          textDecoration: "underline",
          textDecorationColor: "#333",
          display: "block",
          width: "100%",
          textAlign: "center",
        }}
      >
        {prompt}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ej: buscaba una lámpara de techo estilo rústico..."
        rows={2}
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 8,
          padding: "7px 10px",
          color: "#ccc",
          fontSize: 12,
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          lineHeight: 1.4,
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => setOpen(false)}
          style={{
            flex: 1,
            background: "none",
            border: "1px solid #2a2a2a",
            color: "#555",
            fontSize: 11,
            borderRadius: 7,
            padding: "5px 0",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || sending}
          style={{
            flex: 2,
            background: "#222",
            border: "1px solid #333",
            color: text.trim() ? "#fff" : "#555",
            fontSize: 11,
            borderRadius: 7,
            padding: "5px 0",
            cursor: text.trim() ? "pointer" : "default",
          }}
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

// ── NoStockCard ────────────────────────────────────────────

function NoStockCard({
  category,
  sessionId,
  merchantSlug,
}: {
  category: string;
  sessionId: string;
  merchantSlug: string;
}) {
  return (
    <div className="product-card" style={{ opacity: 0.7 }}>
      <div className="card-image-wrap" style={{
        background: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
      }}>
        <span style={{ fontSize: 22 }}>📦</span>
        <span className="card-category-badge">
          {CATEGORY_LABELS[category] || category}
        </span>
      </div>
      <div className="card-body">
        <p className="card-name" style={{ color: "#555" }}>Sin stock en esta categoría</p>
        <FeedbackInline
          category={category}
          sessionId={sessionId}
          merchantSlug={merchantSlug}
          prompt="¿Qué buscabas? Contanos →"
        />
      </div>
    </div>
  );
}

// ── ProductCard ────────────────────────────────────────────

function ProductCard({
  category,
  item,
  sessionId,
  merchantSlug,
  budget,
  onSwapped,
}: {
  category: string;
  item: ComboItem;
  sessionId: string;
  merchantSlug: string;
  budget: number | null;
  onSwapped: (category: string, product: Product) => void;
}) {
  const [current, setCurrent] = useState<Product | null>(item.best);
  const [swapping, setSwapping] = useState<"product" | "color" | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  // Listas separadas por modo para no interferir entre sí
  // allSeenIds: todos los productos vistos → se usa para excluir en modo "product"
  // colorSeenIds: variantes vistas del producto actual → se resetea al cambiar de producto
  const [allSeenIds, setAllSeenIds] = useState<string[]>(
    item.best ? [item.best.id] : []
  );
  const [colorSeenIds, setColorSeenIds] = useState<string[]>([]);
  const [noMoreColors, setNoMoreColors] = useState(false);
  const [noMoreProducts, setNoMoreProducts] = useState(false);
  const [swapCount, setSwapCount] = useState(0);

  if (!current || item.no_stock) return null;

  async function handleAddToCart() {
    capture("widget_add_to_cart", {
      session_id: sessionId,
      product_id: current!.id,
      product_name: current!.name,
      price: current!.price,
      category,
      merchant_slug: merchantSlug,
    });
    fetch(`${AGENTS_URL}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "add_to_cart",
        session_id: sessionId,
        product_id: current!.id,
        product_name: current!.name,
        product_url: current!.url,
        price: current!.price,
        merchant_slug: merchantSlug,
      }),
    }).catch(() => {});
    window.parent.postMessage({ type: "sf-add-to-cart", product: current }, "*");
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  async function handleSwap(mode: "product" | "color") {
    capture("widget_product_swapped", {
      session_id: sessionId,
      category,
      merchant_slug: merchantSlug,
      previous_product_id: current!.id,
      swap_mode: mode,
    });
    setSwapping(mode);

    // "product": excluir todos los productos ya vistos
    // "color": excluir solo el actual + variantes de color ya vistas
    const excludedForRequest =
      mode === "product"
        ? allSeenIds
        : [current!.id, ...colorSeenIds];

    try {
      const res = await fetch(`${AGENTS_URL}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          category,
          excluded_ids: excludedForRequest,
          budget_max: budget,
          merchant_slug: merchantSlug,
          swap_mode: mode,
          current_product_name: current!.name,
        }),
      });
      const data = await res.json();

      if (data.product) {
        setCurrent(data.product);
        onSwapped(category, data.product);
        setSwapCount((n) => n + 1);

        if (mode === "product") {
          // Nuevo producto: agregar a vistos, resetear estado de color
          setAllSeenIds((prev) => [...prev, data.product.id]);
          setColorSeenIds([]);
          setNoMoreColors(false);  // ← reset crítico
          setNoMoreProducts(false);
        } else {
          // Nueva variante de color: trackear en ambas listas
          setColorSeenIds((prev) => [...prev, data.product.id]);
          setAllSeenIds((prev) => [...prev, data.product.id]);
          setNoMoreColors(false);
        }
      } else {
        if (mode === "color") setNoMoreColors(true);
        if (mode === "product") setNoMoreProducts(true);
      }
    } finally {
      setSwapping(null);
    }
  }

  return (
    <div className="product-card">
      <div className="card-image-wrap">
        {current.primary_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.primary_image} alt={current.name} className="card-image" />
        )}
        <span className="card-category-badge">
          {CATEGORY_LABELS[category] || category}
        </span>
      </div>
      <div className="card-body">
        <p className="card-name">{current.name}</p>
        <p className="card-price">{formatPrice(current.price)}</p>
        <div className="card-actions">

          <div className="card-actions-row">
            <button onClick={handleAddToCart} className="btn-primary">
              {addedToCart ? "✓ Agregado" : "🛒 Agregar"}
            </button>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              onClick={() =>
                capture("widget_product_viewed", {
                  session_id: sessionId,
                  product_id: current.id,
                  product_name: current.name,
                  price: current.price,
                  category,
                  merchant_slug: merchantSlug,
                })
              }
            >
              Ver →
            </a>
          </div>
          <div className="card-actions-row">
            <button
              onClick={() => handleSwap("product")}
              disabled={swapping !== null || noMoreProducts}
              className="btn-secondary"
              title={noMoreProducts ? "No hay más productos disponibles" : "Ver otro producto"}
              style={noMoreProducts ? { opacity: 0.4 } : {}}
            >
              {swapping === "product" ? "..." : noMoreProducts ? "Sin más" : "↺ Otro"}
            </button>
            <button
              onClick={() => handleSwap("color")}
              disabled={swapping !== null || noMoreColors}
              className="btn-secondary"
              title={noMoreColors ? "No hay más colores disponibles" : "Ver en otro color"}
              style={noMoreColors ? { opacity: 0.4 } : {}}
            >
              {swapping === "color" ? "..." : noMoreColors ? "Sin colores" : "◑ Color"}
            </button>
          </div>
        </div>
        {swapCount >= 2 && (
          <FeedbackInline
            category={category}
            sessionId={sessionId}
            merchantSlug={merchantSlug}
            prompt="¿No encontrás lo que buscás?"
          />
        )}
      </div>
    </div>
  );
}

// ── ComboSummaryBar ────────────────────────────────────────

function ComboSummaryBar({
  combo,
  shareToken,
  merchantSlug,
}: {
  combo: ComboData;
  shareToken: string | null;
  merchantSlug: string;
}) {
  const [copied, setCopied] = useState(false);

  const items = Object.values(combo).filter((item) => item.best && !item.no_stock);
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + (item.best?.price || 0), 0);

  async function handleShare() {
    if (!shareToken) return;
    const url = `${window.location.origin}/compartir/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(url, "_blank");
    }
  }

  return (
    <div style={{
      borderTop: "1px solid #1f1f1f",
      padding: "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#0d0d0d",
      flexShrink: 0,
    }}>
      <div style={{ lineHeight: 1.3 }}>
        <span style={{ fontSize: 11, color: "#555" }}>
          {items.length} producto{items.length !== 1 ? "s" : ""}
        </span>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
          {formatPrice(total)}
        </div>
      </div>
      {shareToken && (
        <button
          onClick={handleShare}
          style={{
            background: copied ? "#1a3a1a" : "transparent",
            border: `1px solid ${copied ? "#2a6a2a" : "#333"}`,
            color: copied ? "#6ee36e" : "#aaa",
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "¡Link copiado!" : "Compartir ↗"}
        </button>
      )}
    </div>
  );
}

// ── Main Widget ────────────────────────────────────────────

export default function WidgetPage() {
  const params = useParams();
  const merchantSlug = params.merchant as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string>("image/jpeg");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // clarification state
  const [step, setStep] = useState<string>("intake");
  const [availableGroups, setAvailableGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [noBudgetLimit, setNoBudgetLimit] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [combo, setCombo] = useState<ComboData | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init PostHog and track widget open
  useEffect(() => {
    initPostHog();
    capture("widget_opened", { merchant_slug: merchantSlug });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, step]);

  // Fetch available groups for this merchant on mount
  useEffect(() => {
    fetch(`${AGENTS_URL}/categories`)
      .then((r) => r.json())
      .then((data) => setAvailableGroups(data))
      .catch(() => {});
  }, []);

  function handleImageSelect(file: File) {
    capture("widget_image_uploaded", { merchant_slug: merchantSlug });
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Extract base64 (remove data:image/...;base64, prefix)
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setImageMediaType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage() {
    if (!input.trim() && !imageBase64) return;
    setLoading(true);
    setError(null);

    capture("widget_message_sent", {
      merchant_slug: merchantSlug,
      has_image: !!imageBase64,
      session_id: sessionId,
    });

    const userMsg: Message = {
      role: "user",
      text: input || "📷 Foto subida",
      imagePreview: imagePreview || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    const sentInput = input;
    const sentImage = imageBase64;
    const sentMediaType = imageMediaType;
    setInput("");
    clearImage();

    try {
      const res = await fetch(`${AGENTS_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: sentInput,
          session_id: sessionId,
          merchant_slug: merchantSlug,
          image_base64: sentImage,
          image_media_type: sentMediaType,
        }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      setSessionId(data.session_id);
      setPendingSessionId(data.session_id);

      if (data.step === "clarifying" || data.step === "budget_only") {
        setStep(data.step);
        capture("widget_clarification_needed", {
          merchant_slug: merchantSlug,
          step: data.step,
          session_id: data.session_id,
        });
        if (data.context?.available_groups) {
          const groups = await fetch(`${AGENTS_URL}/categories`).then((r) => r.json());
          setAvailableGroups(groups);
        }
        if (data.context?.pre_selected_groups?.length) {
          setSelectedGroups(data.context.pre_selected_groups);
        }
        if (data.context?.budget_total) {
          setBudget(data.context.budget_total);
          setBudgetInput(String(data.context.budget_total));
        }
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      } else if (data.step === "interactive" && data.combo) {
        setStep("interactive");
        setCombo(data.combo);
        if (data.share_token) setShareToken(data.share_token);
        capture("widget_combo_shown", {
          merchant_slug: merchantSlug,
          session_id: data.session_id,
          categories_count: Object.keys(data.combo).length,
          categories: Object.keys(data.combo),
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.reply, combo: data.combo },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function sendClarification() {
    if (!pendingSessionId || selectedGroups.length === 0) return;
    setLoading(true);
    setError(null);
    setStep("searching");

    capture("widget_clarification_submitted", {
      merchant_slug: merchantSlug,
      session_id: pendingSessionId,
      selected_groups: selectedGroups,
      groups_count: selectedGroups.length,
      has_budget: budget !== null,
      budget_total: budget,
    });

    try {
      const res = await fetch(`${AGENTS_URL}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: pendingSessionId,
          selected_groups: selectedGroups,
          budget_total: budget,
          merchant_slug: merchantSlug,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      setStep("interactive");
      setCombo(data.combo);
      if (data.share_token) setShareToken(data.share_token);
      capture("widget_combo_shown", {
        merchant_slug: merchantSlug,
        session_id: pendingSessionId,
        categories_count: Object.keys(data.combo).length,
        categories: Object.keys(data.combo),
        source: "clarification",
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, combo: data.combo },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      setStep("clarifying");
    } finally {
      setLoading(false);
    }
  }

  function handleSwapped(category: string, product: Product) {
    setCombo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: { best: product, alternative: null, no_stock: false },
      };
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isIdle = messages.length === 0 && step === "intake";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        .widget {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 480px;
          margin: 0 auto;
          background: #0a0a0a;
          color: #fff;
        }

        .widget-header {
          padding: 16px 20px;
          border-bottom: 1px solid #1f1f1f;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .widget-logo {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: #fff;
        }
        .widget-merchant {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .idle-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 12px;
          text-align: center;
          padding: 40px 20px;
        }
        .idle-title {
          font-size: 18px;
          font-weight: 600;
          color: #fff;
        }
        .idle-sub {
          font-size: 13px;
          color: #666;
          max-width: 280px;
          line-height: 1.5;
        }

        .message-bubble {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
        }
        .message-bubble.user {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        .message-bubble.assistant {
          background: transparent;
          align-self: flex-start;
          padding: 4px 0;
          color: #ccc;
        }
        .message-image-preview {
          width: 140px;
          border-radius: 10px;
          margin-bottom: 6px;
          display: block;
        }

        .combo-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          margin-top: 8px;
        }

        .product-card {
          background: #111;
          border: 1px solid #222;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          gap: 12px;
          padding: 12px;
        }
        .card-image-wrap {
          position: relative;
          flex-shrink: 0;
          width: 80px;
          height: 80px;
        }
        .card-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
        }
        .card-category-badge {
          position: absolute;
          bottom: 4px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 9px;
          color: #aaa;
          background: rgba(0,0,0,0.7);
          border-radius: 0 0 6px 6px;
          padding: 2px 0;
        }
        .card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
        }
        .card-name {
          font-size: 13px;
          font-weight: 500;
          color: #e0e0e0;
          line-height: 1.3;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .card-price {
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin-top: 4px;
        }
        .card-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
        .card-actions-row {
          display: flex;
          gap: 6px;
        }
        .btn-primary {
          flex: 1;
          text-align: center;
          background: #fff;
          color: #000;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 8px;
          text-decoration: none;
          border: none;
          cursor: pointer;
        }
        .btn-secondary {
          flex: 1;
          text-align: center;
          background: transparent;
          color: #aaa;
          font-size: 12px;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #333;
          cursor: pointer;
        }
        .btn-secondary:hover { border-color: #555; color: #fff; }
        .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Clarification UI */
        .clarify-panel {
          background: #111;
          border: 1px solid #222;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 4px;
        }
        .clarify-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #333;
          font-size: 13px;
          cursor: pointer;
          background: transparent;
          color: #aaa;
          transition: all 0.15s;
        }
        .chip.selected {
          background: #fff;
          color: #000;
          border-color: #fff;
        }
        .budget-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .budget-input {
          flex: 1;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 8px 12px;
          color: #fff;
          font-size: 14px;
          outline: none;
        }
        .budget-input:focus { border-color: #555; }
        .confirm-btn {
          background: #fff;
          color: #000;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
        }
        .confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Input bar */
        .input-bar {
          padding: 12px 16px;
          border-top: 1px solid #1a1a1a;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .image-preview-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #111;
          border-radius: 8px;
          padding: 6px 10px;
        }
        .image-preview-thumb {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          object-fit: cover;
        }
        .image-preview-name {
          font-size: 12px;
          color: #888;
          flex: 1;
        }
        .remove-image {
          background: none;
          border: none;
          color: #555;
          cursor: pointer;
          font-size: 16px;
          padding: 0 4px;
        }
        .input-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }
        .text-input {
          flex: 1;
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          padding: 10px 14px;
          color: #fff;
          font-size: 14px;
          outline: none;
          resize: none;
          min-height: 42px;
          max-height: 120px;
          line-height: 1.4;
        }
        .text-input:focus { border-color: #444; }
        .text-input::placeholder { color: #444; }
        .image-btn {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          border: 1px solid #2a2a2a;
          background: #111;
          color: #666;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .image-btn:hover { border-color: #444; color: #aaa; }
        .send-btn {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          border: none;
          background: #fff;
          color: #000;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 16px;
          transition: opacity 0.15s;
        }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .error-banner {
          background: #2a0a0a;
          border: 1px solid #5a1a1a;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #ff6b6b;
        }
        .loading-dot {
          display: inline-block;
          animation: blink 1s infinite;
          color: #555;
          font-size: 20px;
          letter-spacing: 4px;
        }
        @keyframes blink { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>

      <div className="widget">
        {/* Header */}
        <div className="widget-header">
          <div>
            <div className="widget-logo">Stockfish</div>
            <div className="widget-merchant">{merchantSlug}</div>
          </div>
        </div>

        {/* Messages / Idle */}
        {isIdle ? (
          <div className="idle-state">
            <div style={{ fontSize: 36 }}>🛋️</div>
            <div className="idle-title">Encontrá tu estilo</div>
            <div className="idle-sub">
              Describí cómo querés que quede tu espacio o subí una foto que te inspire.
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.imagePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.imagePreview} alt="foto subida" className="message-image-preview" style={{ alignSelf: "flex-end" }} />
                )}
                <div className={`message-bubble ${msg.role}`}>
                  {renderText(msg.text)}
                </div>
                {msg.combo && (
                  <div className="combo-grid" style={{ marginTop: 12 }}>
                    {Object.entries(msg.combo).map(([cat, item]) =>
                      item.no_stock || !item.best ? (
                        <NoStockCard
                          key={cat}
                          category={cat}
                          sessionId={sessionId!}
                          merchantSlug={merchantSlug}
                        />
                      ) : (
                      <ProductCard
                        key={cat}
                        category={cat}
                        item={item}
                        sessionId={sessionId!}
                        merchantSlug={merchantSlug}
                        budget={budget}
                        onSwapped={handleSwapped}
                      />
                      )
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Clarification panel */}
            {(step === "clarifying" || step === "budget_only") && (
              <div className="clarify-panel">
                {step === "clarifying" && (
                  <>
                    <span className="clarify-label">¿Qué buscás?</span>
                    <div className="chips">
                      {availableGroups.map((g) => (
                        <button
                          key={g.id}
                          className={`chip ${selectedGroups.includes(g.id) ? "selected" : ""}`}
                          onClick={() =>
                            setSelectedGroups((prev) =>
                              prev.includes(g.id)
                                ? prev.filter((x) => x !== g.id)
                                : [...prev, g.id]
                            )
                          }
                        >
                          {g.emoji} {g.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <span className="clarify-label">Presupuesto total (opcional)</span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 2 }}>
                  <input
                    type="checkbox"
                    checked={noBudgetLimit}
                    onChange={(e) => {
                      setNoBudgetLimit(e.target.checked);
                      if (e.target.checked) {
                        setBudget(null);
                        setBudgetInput("");
                      }
                    }}
                    style={{ width: 16, height: 16, accentColor: "#fff", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, color: "#aaa" }}>Sin límite de presupuesto</span>
                </label>
                <div className="budget-row">
                  <input
                    className="budget-input"
                    type="number"
                    placeholder="Ej: 150000"
                    value={budgetInput}
                    disabled={noBudgetLimit}
                    style={noBudgetLimit ? { opacity: 0.3 } : {}}
                    onChange={(e) => {
                      setBudgetInput(e.target.value);
                      setBudget(e.target.value ? Number(e.target.value) : null);
                    }}
                  />
                  <button
                    className="confirm-btn"
                    disabled={loading || (step === "clarifying" && selectedGroups.length === 0)}
                    onClick={sendClarification}
                  >
                    Buscar
                  </button>
                </div>
              </div>
            )}

            {(loading || step === "searching") && (
              <div style={{ alignSelf: "flex-start" }}>
                <span className="loading-dot">• • •</span>
              </div>
            )}
            {error && <div className="error-banner">{error}</div>}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Resumen del combo */}
        {step === "interactive" && combo && (
          <ComboSummaryBar
            combo={combo}
            shareToken={shareToken}
            merchantSlug={merchantSlug}
          />
        )}

        {/* Input bar */}
        <div className="input-bar">
          {imagePreview && (
            <div className="image-preview-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="preview" className="image-preview-thumb" />
              <span className="image-preview-name">Imagen lista para analizar</span>
              <button className="remove-image" onClick={clearImage}>✕</button>
            </div>
          )}
          <div className="input-row">
            <button
              className="image-btn"
              title="Subir foto"
              onClick={() => fileInputRef.current?.click()}
            >
              📷
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageSelect(file);
              }}
            />
            <textarea
              className="text-input"
              placeholder={step === "interactive" ? "Ajustá el estilo, presupuesto o una categoría…" : "Describí tu estilo o subí una foto…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className="send-btn"
              disabled={loading || (!input.trim() && !imageBase64)}
              onClick={sendMessage}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
