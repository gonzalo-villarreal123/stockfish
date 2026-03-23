"use client";

import { useState, useRef, useEffect } from "react";

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL || "http://localhost:8000";

interface Product {
  id: string;
  name: string;
  price: number;
  primary_image: string;
  url: string;
  category: string;
  merchant_slug: string;
  similarity: number;
  rank: number;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  products?: Product[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

// ── Cart ────────────────────────────────────────────────────

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

// ── Product Card ────────────────────────────────────────────

function ProductCard({
  product,
  selected,
  onToggle,
}: {
  product: Product;
  selected: boolean;
  onToggle: (product: Product) => void;
}) {
  return (
    <div className={`group flex-shrink-0 w-44 bg-neutral-900 rounded-xl overflow-hidden border transition-all ${selected ? "border-white" : "border-neutral-800 hover:border-neutral-600"}`}>
      <div className="relative w-full h-44 overflow-hidden bg-neutral-800">
        <a href={product.url} target="_blank" rel="noopener noreferrer">
          <img
            src={product.primary_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </a>
        <button
          onClick={() => onToggle(product)}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-md ${
            selected
              ? "bg-white text-black"
              : "bg-black/50 text-white hover:bg-black/80"
          }`}
        >
          {selected ? (
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
      <div className="p-3">
        <p className="text-xs text-neutral-400 uppercase tracking-wide mb-1">{product.merchant_slug}</p>
        <p className="text-sm text-white font-medium leading-snug line-clamp-2 mb-2">{product.name}</p>
        <p className="text-sm font-semibold text-white">{formatPrice(product.price)}</p>
      </div>
    </div>
  );
}

// ── Product Carousel ────────────────────────────────────────

function ProductCarousel({
  products,
  cartIds,
  onToggle,
}: {
  products: Product[];
  cartIds: Set<string>;
  onToggle: (product: Product) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });
  }

  return (
    <div className="ml-10 relative group/carousel">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 bg-neutral-700 hover:bg-neutral-600 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            selected={cartIds.has(p.id)}
            onToggle={onToggle}
          />
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 bg-neutral-700 hover:bg-neutral-600 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

// ── Assistant Message ───────────────────────────────────────

function AssistantMessage({
  message,
  cartIds,
  onToggle,
}: {
  message: Message;
  cartIds: Set<string>;
  onToggle: (product: Product) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-start">
        <div className="w-7 h-7 rounded-full bg-white flex-shrink-0 flex items-center justify-center mt-0.5">
          <span className="text-black text-xs font-bold">S</span>
        </div>
        <p className="text-neutral-200 text-sm leading-relaxed pt-1">{message.text}</p>
      </div>
      {message.products && message.products.length > 0 && (
        <ProductCarousel products={message.products} cartIds={cartIds} onToggle={onToggle} />
      )}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hola, soy Stockfish. Contame qué estilo de decoración estás buscando y te muestro productos reales que pueden quedar bien en tu espacio.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cart, setCart] = useState<Product[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cartIds = new Set(cart.map((p) => p.id));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function toggleCart(product: Product) {
    setCart((prev) =>
      prev.find((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((p) => p.id !== id));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch(`${AGENTS_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      const data = await res.json();
      setSessionId(data.session_id);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, products: data.products },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Hubo un error al conectar con el servidor. Verificá que la API esté corriendo." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center px-6 py-4 border-b border-neutral-800">
        <span className="text-white font-semibold tracking-tight text-lg">Stockfish</span>
        <span className="ml-2 text-xs text-neutral-500 mt-0.5">decoración con IA</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <AssistantMessage key={i} message={msg} cartIds={cartIds} onToggle={toggleCart} />
            ) : (
              <div key={i} className="flex justify-end">
                <div className="bg-neutral-800 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-xs">
                  {msg.text}
                </div>
              </div>
            )
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

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 focus-within:border-neutral-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describí el estilo que buscás..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm placeholder-neutral-500 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto scrollbar-hide"
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = t.scrollHeight + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
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

      {/* Cart */}
      <Cart items={cart} onRemove={removeFromCart} />
    </div>
  );
}
