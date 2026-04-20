"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReferralShareCTA from "../../components/ReferralShareCTA";

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL || "http://localhost:8000";

const MAX_CHARS = 500;

const EXAMPLE_PROMPTS = [
  "Sillón para living moderno",
  "Mesa ratona estilo escandinavo",
  "Dormitorio minimalista en tonos neutros",
  "Comedor industrial con madera y metal",
  "Balcón pequeño con ambiente relajante",
  "Home office con estilo contemporáneo",
];

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
  combo?: ComboData;
  feedbackCategory?: string;
}

// ── Helpers ────────────────────────────────────────────────

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

function renderText(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    return (
      <span key={i}>
        {i > 0 && <br />}
        {parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
          if (part.startsWith("*") && part.endsWith("*"))
            return <em key={j} className="text-neutral-300 not-italic">{part.slice(1, -1)}</em>;
          return <span key={j}>{part}</span>;
        })}
      </span>
    );
  });
}

// ── Category Chips ─────────────────────────────────────────

function CategoryChips({
  groups,
  onNext,
}: {
  groups: CategoryGroup[];
  onNext: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="ml-10 mt-3">
      <div className="flex flex-wrap gap-2 mb-4">
        {groups.map((g) => {
          const active = selected.includes(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                active
                  ? "bg-white text-black border-white"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
              }`}
            >
              <span>{g.emoji}</span>
              <span>{g.label}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onNext(selected)}
        disabled={selected.length === 0}
        className="bg-white text-black px-6 py-2 rounded-full text-sm font-semibold disabled:opacity-30 hover:bg-neutral-200 transition-colors"
      >
        Siguiente →
      </button>
    </div>
  );
}

// ── Budget Slider ──────────────────────────────────────────

function BudgetSlider({
  onConfirm,
}: {
  onConfirm: (budget: number | null) => void;
}) {
  const [value, setValue] = useState(500000);
  const [noLimit, setNoLimit] = useState(false);

  return (
    <div className="ml-10 mt-3 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-neutral-400">Presupuesto total</span>
        <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={noLimit}
            onChange={(e) => setNoLimit(e.target.checked)}
            className="accent-white w-4 h-4"
          />
          Sin límite
        </label>
      </div>

      {!noLimit && (
        <>
          <p className="text-white text-2xl font-semibold mb-3">{formatPrice(value)}</p>
          <input
            type="range"
            min={50000}
            max={2000000}
            step={50000}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full accent-white cursor-pointer"
          />
          <div className="flex justify-between text-xs text-neutral-600 mt-1 mb-4">
            <span>$50.000</span>
            <span>$2.000.000</span>
          </div>
        </>
      )}

      <button
        onClick={() => onConfirm(noLimit ? null : value)}
        className="mt-2 bg-white text-black px-6 py-2 rounded-full text-sm font-semibold hover:bg-neutral-200 transition-colors"
      >
        Armar mi combo →
      </button>
    </div>
  );
}

// ── Combo Card ─────────────────────────────────────────────

function ComboCard({
  category,
  item,
  cartIds,
  wishlistIds,
  swapping,
  onSwap,
  onToggleCart,
  onToggleWishlist,
}: {
  category: string;
  item: ComboItem;
  cartIds: Set<string>;
  wishlistIds: Set<string>;
  swapping: boolean;
  onSwap: (category: string) => void;
  onToggleCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const label = CATEGORY_LABELS[category] || category;
  const product = item.best;

  if (item.no_stock || !product) {
    return (
      <div className="flex flex-col rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        <div className="px-4 py-2 bg-neutral-800/50 border-b border-neutral-800">
          <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-neutral-600 text-sm">
          Sin stock disponible
        </div>
      </div>
    );
  }

  const inCart = cartIds.has(product.id);
  const inWishlist = wishlistIds.has(product.id);

  return (
    <div className="flex flex-col rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-neutral-700 hover:shadow-lg hover:shadow-black/40 transition-all">
      <a href={product.url} target="_blank" rel="noopener noreferrer" className="block relative overflow-hidden bg-neutral-800 aspect-square">
        {imgError || !product.primary_image ? (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <img
            src={product.primary_image}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        )}
      </a>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <p className="text-sm text-white font-medium leading-snug line-clamp-2 flex-1">{product.name}</p>
          <span className="flex-shrink-0 text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700 whitespace-nowrap">
            {product.merchant_slug}
          </span>
        </div>
        <p className="text-sm font-semibold text-white">{formatPrice(product.price)}</p>

        <div className="flex gap-2 mt-auto pt-1">
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs bg-white text-black font-semibold py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Ver en tienda
          </a>
          <button
            onClick={() => onSwap(category)}
            disabled={swapping}
            className="flex-1 text-xs border border-neutral-700 text-neutral-300 py-1.5 rounded-lg hover:border-neutral-500 hover:text-white transition-colors disabled:opacity-40"
          >
            {swapping ? "..." : "Cambiar ↺"}
          </button>
          <button
            onClick={() => onToggleWishlist(product)}
            title={inWishlist ? "Quitar de guardados" : "Guardar"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
              inWishlist
                ? "bg-red-500/20 border border-red-500/40 text-red-400"
                : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={inWishlist ? "currentColor" : "none"}>
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => onToggleCart(product)}
            title={inCart ? "Quitar de selección" : "Agregar a selección"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
              inCart
                ? "bg-white text-black"
                : "border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
            }`}
          >
            {inCart ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Feedback Prompt ────────────────────────────────────────

function FeedbackPrompt({
  category,
  sessionId,
  agentsUrl,
  onDone,
}: {
  category: string;
  sessionId: string | null;
  agentsUrl: string;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const label = CATEGORY_LABELS[category] || category;

  async function submit() {
    if (!text.trim()) return;
    await fetch(`${agentsUrl}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, category, text: text.trim() }),
    }).catch(() => {});
    setSent(true);
    onDone();
  }

  if (sent) {
    return (
      <p className="ml-10 mt-2 text-sm text-neutral-400">
        ¡Gracias! Vamos a salir a buscarlo. 🙌
      </p>
    );
  }

  return (
    <div className="ml-10 mt-3 max-w-sm">
      <p className="text-sm text-neutral-400 mb-3">
        Recorrimos todo el catálogo de <strong className="text-white">{label}</strong>. ¿Qué producto estabas buscando exactamente? Nos ayudás a conseguirlo.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ej: sillón esquinero gris oscuro..."
          className="flex-1 bg-neutral-900 border border-neutral-700 text-white text-sm px-3 py-2 rounded-xl placeholder-neutral-600 outline-none focus:border-neutral-500"
        />
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-30 hover:bg-neutral-200 transition-colors"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}


// ── Combo Grid ─────────────────────────────────────────────

function ComboGrid({
  combo,
  cartIds,
  wishlistIds,
  swappingCats,
  onSwap,
  onToggleCart,
  onToggleWishlist,
}: {
  combo: ComboData;
  cartIds: Set<string>;
  wishlistIds: Set<string>;
  swappingCats: Set<string>;
  onSwap: (category: string) => void;
  onToggleCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
}) {
  const entries = Object.entries(combo).filter(([, item]) => !item.no_stock && item.best);

  if (entries.length === 0) return null;

  return (
    <div className="ml-10 mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {entries.map(([cat, item]) => (
        <ComboCard
          key={cat}
          category={cat}
          item={item}
          cartIds={cartIds}
          wishlistIds={wishlistIds}
          swapping={swappingCats.has(cat)}
          onSwap={onSwap}
          onToggleCart={onToggleCart}
          onToggleWishlist={onToggleWishlist}
        />
      ))}
    </div>
  );
}

// ── Cart ───────────────────────────────────────────────────

function Cart({ items, onRemove }: { items: Product[]; onRemove: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const total = items.reduce((sum, p) => sum + p.price, 0);
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50">
      {open && (
        <div className="mb-2 w-72 bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Mi selección</span>
            <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-hide">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 last:border-0">
                <img src={p.primary_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-neutral-800 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium leading-snug line-clamp-1">{p.name}</p>
                  <p className="text-neutral-400 text-xs mt-0.5">{formatPrice(p.price)}</p>
                </div>
                <button onClick={() => onRemove(p.id)} className="text-neutral-600 hover:text-neutral-400 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-neutral-400 text-xs">{items.length} {items.length === 1 ? "producto" : "productos"}</p>
              <p className="text-white text-sm font-semibold">{formatPrice(total)}</p>
            </div>
            <button className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-xl hover:bg-neutral-200 transition-colors">
              Comprar
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="ml-auto flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-neutral-200 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {items.length}
      </button>
    </div>
  );
}

// ── Wishlist ───────────────────────────────────────────────

function Wishlist({ items, onRemove }: { items: Product[]; onRemove: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-28 z-50">
      {open && (
        <div className="mb-2 w-72 bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Guardados</span>
            <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-hide">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 last:border-0">
                <img src={p.primary_image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-neutral-800 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-white text-xs font-medium leading-snug line-clamp-1 hover:underline">{p.name}</a>
                  <p className="text-neutral-400 text-xs mt-0.5">{formatPrice(p.price)}</p>
                </div>
                <button onClick={() => onRemove(p.id)} className="text-neutral-600 hover:text-neutral-400 flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="px-4 py-3">
            <p className="text-neutral-400 text-xs">{items.length} {items.length === 1 ? "producto guardado" : "productos guardados"}</p>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="ml-auto flex items-center gap-2 bg-neutral-900 border border-neutral-700 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg hover:bg-neutral-800 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={open ? "currentColor" : "none"} className="text-red-400">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {items.length}
      </button>
    </div>
  );
}


// ── Share Button ───────────────────────────────────────────

function ShareComboButton({ shareToken }: { shareToken: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!shareToken) return null;

  const url = `${window.location.origin}/compartir/${shareToken}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Mi idea de decoración — Stockfish", url });
        return;
      } catch {
        // fallthrough to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="ml-10 mt-3 flex items-center gap-2 text-xs text-neutral-400 border border-neutral-800 px-3 py-1.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {copied ? "¡Link copiado!" : "Compartir esta idea"}
    </button>
  );
}


// ── Main ───────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cart, setCart] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [swappingCats, setSwappingCats] = useState<Set<string>>(new Set());
  const [shownIds, setShownIds] = useState<Record<string, string[]>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null);
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const swapCountRef = useRef<Record<string, number>>({});
  const SWAP_LIMIT = 5;
  const [context, setContext] = useState<{
    style_keywords: string[];
    style_tags: string[];
    budget_total: number | null;
  }>({ style_keywords: [], style_tags: [], budget_total: null });

  // Widget state: which interactive widget to show
  const [widgetStep, setWidgetStep] = useState<"none" | "categories" | "budget">("none");
  const [availableGroups, setAvailableGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cartIds = new Set(cart.map((p) => p.id));
  const wishlistIds = new Set(wishlist.map((p) => p.id));

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stockfish_wishlist");
      if (saved) setWishlist(JSON.parse(saved));
    } catch {}
  }, []);

  // Persist wishlist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("stockfish_wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  // Track whether user is scrolled away from bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBadge(distFromBottom > 100);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll when new messages arrive, only if user is near bottom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 200) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      // User is reading history — show badge instead of force-scrolling
      setShowScrollBadge(true);
    }
  }, [messages, loading, widgetStep]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBadge(false);
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setErrorMsg(null);
    setRetryFn(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    setWidgetStep("none");

    const doSend = async () => {
      try {
        const res = await fetch(`${AGENTS_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, session_id: sessionId }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setSessionId(data.session_id);
        if (data.context) setContext(data.context);

        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);

        if (data.step === "budget_only" && data.context?.pre_selected_groups) {
          setSelectedGroups(data.context.pre_selected_groups);
          setWidgetStep("budget");
        } else if (data.step === "clarifying" && data.context?.available_groups) {
          const catRes = await fetch(`${AGENTS_URL}/categories`);
          const allGroups: CategoryGroup[] = await catRes.json();
          const filtered = allGroups.filter((g) =>
            data.context.available_groups.includes(g.id)
          );
          setAvailableGroups(filtered);
          setWidgetStep("categories");
        }
      } catch {
        setErrorMsg("No se pudo conectar con el servidor.");
        setRetryFn(() => doSend);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    };

    await doSend();
  }

  function handleCategoriesNext(selected: string[]) {
    setSelectedGroups(selected);
    const groupLabels = availableGroups
      .filter((g) => selected.includes(g.id))
      .map((g) => `${g.emoji} ${g.label}`)
      .join(", ");
    setMessages((prev) => [...prev, { role: "user", text: groupLabels }]);
    setWidgetStep("budget");
  }

  async function handleBudgetConfirm(budget: number | null) {
    if (!sessionId) return;

    const budgetText = budget ? formatPrice(budget) : "Sin límite de presupuesto";
    setMessages((prev) => [...prev, { role: "user", text: budgetText }]);
    setWidgetStep("none");
    setLoading(true);
    setErrorMsg(null);
    setRetryFn(null);

    const doConfirm = async () => {
      try {
        const res = await fetch(`${AGENTS_URL}/clarify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            selected_groups: selectedGroups,
            budget_total: budget,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.context) setContext(data.context);

        if (data.step === "interactive" && data.combo) {
          const newCombo: ComboData = data.combo;
          const ids: Record<string, string[]> = {};
          for (const [cat, item] of Object.entries(newCombo)) {
            const shown: string[] = [];
            if (item.best?.id) shown.push(String(item.best.id));
            if (item.alternative?.id) shown.push(String(item.alternative.id));
            ids[cat] = shown;
          }
          setShownIds(ids);
          if (data.share_token) setShareToken(data.share_token);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: data.reply, combo: newCombo },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: data.reply },
          ]);
        }
      } catch {
        setErrorMsg("No se pudo armar tu combo.");
        setRetryFn(() => doConfirm);
      } finally {
        setLoading(false);
      }
    };

    await doConfirm();
  }

  async function handleSwap(category: string) {
    if (!sessionId) return;

    const currentCount = swapCountRef.current[category] || 0;

    if (currentCount >= SWAP_LIMIT) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "", feedbackCategory: category },
      ]);
      return;
    }

    setSwappingCats((prev) => new Set(prev).add(category));

    try {
      const excluded = shownIds[category] || [];
      const res = await fetch(`${AGENTS_URL}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          category,
          excluded_ids: excluded,
          budget_max: context.budget_total,
        }),
      });

      if (!res.ok) throw new Error();
      const data: { product: Product | null } = await res.json();

      swapCountRef.current[category] = currentCount + 1;

      if (data.product) {
        const newProduct = data.product;
        setShownIds((prev) => ({
          ...prev,
          [category]: [...(prev[category] || []), String(newProduct.id)],
        }));
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].combo) {
              updated[i] = {
                ...updated[i],
                combo: {
                  ...updated[i].combo!,
                  [category]: { best: newProduct, alternative: null, no_stock: false },
                },
              };
              break;
            }
          }
          return updated;
        });
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "", feedbackCategory: category },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "No pude buscar una alternativa. Intentá de nuevo." },
      ]);
    } finally {
      setSwappingCats((prev) => {
        const next = new Set(prev);
        next.delete(category);
        return next;
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const inputDisabled = widgetStep !== "none" || loading;
  const charsLeft = MAX_CHARS - input.length;
  const showCharLimit = input.length > MAX_CHARS * 0.8;

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center px-6 py-4 border-b border-neutral-800">
        <span className="text-white font-semibold tracking-tight text-lg">Stockfish</span>
        <span className="ml-2 text-xs text-neutral-500 mt-0.5">decoración con IA</span>
      </header>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide"
      >
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-5">
                <span className="text-black text-xl font-bold">S</span>
              </div>
              <h1 className="text-white text-xl font-semibold mb-1">Hola, soy Stockfish</h1>
              <p className="text-neutral-400 text-sm mb-8 max-w-xs">
                Contame qué estilo buscás y te armo un combo de productos reales de tiendas argentinas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left text-sm text-neutral-300 border border-neutral-800 rounded-xl px-3 py-2.5 hover:border-neutral-600 hover:text-white transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <div key={i} className="flex flex-col gap-3">
                <div className="flex gap-3 items-start">
                  <div className="w-7 h-7 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-0.5">
                    <span className="text-black text-xs font-bold">S</span>
                  </div>
                  {msg.text && (
                    <p className="text-neutral-200 text-sm leading-relaxed pt-1">
                      {renderText(msg.text)}
                    </p>
                  )}
                </div>
                {msg.feedbackCategory && (
                  <FeedbackPrompt
                    category={msg.feedbackCategory}
                    sessionId={sessionId}
                    agentsUrl={AGENTS_URL}
                    onDone={() => {}}
                  />
                )}
                {msg.combo && Object.keys(msg.combo).length > 0 && (
                  <>
                    <ComboGrid
                      combo={msg.combo}
                      cartIds={cartIds}
                      wishlistIds={wishlistIds}
                      swappingCats={swappingCats}
                      onSwap={handleSwap}
                      onToggleCart={(p) =>
                        setCart((prev) =>
                          prev.find((x) => x.id === p.id)
                            ? prev.filter((x) => x.id !== p.id)
                            : [...prev, p]
                        )
                      }
                      onToggleWishlist={(p) =>
                        setWishlist((prev) =>
                          prev.find((x) => x.id === p.id)
                            ? prev.filter((x) => x.id !== p.id)
                            : [...prev, p]
                        )
                      }
                    />
                    {i === messages.length - 1 && (
                      <>
                        <ShareComboButton shareToken={shareToken} />
                        <ReferralShareCTA />
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="bg-neutral-800 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85vw] sm:max-w-xs">
                  {msg.text}
                </div>
              </div>
            )
          )}

          {/* Widgets inline */}
          {widgetStep === "categories" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-0.5">
                  <span className="text-black text-xs font-bold">S</span>
                </div>
                <p className="text-neutral-200 text-sm leading-relaxed pt-1">
                  ¿Qué categorías querés incluir en tu combo?
                </p>
              </div>
              <CategoryChips groups={availableGroups} onNext={handleCategoriesNext} />
            </div>
          )}

          {widgetStep === "budget" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-0.5">
                  <span className="text-black text-xs font-bold">S</span>
                </div>
                <p className="text-neutral-200 text-sm leading-relaxed pt-1">
                  ¿Tenés un presupuesto total en mente?
                </p>
              </div>
              <BudgetSlider onConfirm={handleBudgetConfirm} />
            </div>
          )}

          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-full bg-white flex-shrink-0 flex items-center justify-center">
                <span className="text-black text-xs font-bold">S</span>
              </div>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* Inline error with Retry */}
          {errorMsg && !loading && (
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-red-900/50 border border-red-800 flex-shrink-0 flex items-center justify-center mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <p className="text-red-400 text-sm">{errorMsg}</p>
                {retryFn && (
                  <button
                    onClick={() => {
                      setLoading(true);
                      setErrorMsg(null);
                      retryFn();
                    }}
                    className="text-xs font-semibold text-white bg-neutral-800 border border-neutral-700 px-3 py-1 rounded-lg hover:bg-neutral-700 transition-colors flex-shrink-0"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll to bottom badge */}
      {showScrollBadge && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hover:bg-neutral-700 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Nuevo mensaje
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className={`flex items-end gap-3 bg-neutral-900 border rounded-2xl px-4 py-3 transition-colors ${
            inputDisabled ? "border-neutral-800 opacity-40" : "border-neutral-700 focus-within:border-neutral-500"
          }`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={inputDisabled}
              placeholder={widgetStep !== "none" ? "Usá los botones de arriba..." : "Describí el estilo que buscás..."}
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-neutral-500 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto scrollbar-hide disabled:cursor-not-allowed"
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = t.scrollHeight + "px";
              }}
            />
            {showCharLimit && (
              <span className={`text-xs flex-shrink-0 mb-1 ${charsLeft <= 20 ? "text-red-400" : "text-neutral-500"}`}>
                {charsLeft}
              </span>
            )}
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || inputDisabled}
              className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center disabled:opacity-30 hover:bg-neutral-200 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L12 20M12 4L6 10M12 4L18 10" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-neutral-600 mt-2">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>

      <Cart items={cart} onRemove={(id) => setCart((p) => p.filter((x) => x.id !== id))} />
      <Wishlist items={wishlist} onRemove={(id) => setWishlist((p) => p.filter((x) => x.id !== id))} />
    </div>
  );
}
