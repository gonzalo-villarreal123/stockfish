"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL || "http://localhost:8000";

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

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

function SharedComboCard({ category, item }: { category: string; item: ComboItem }) {
  const [imgError, setImgError] = useState(false);
  const product = item.best;
  const label = CATEGORY_LABELS[category] || category;

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
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-center text-xs bg-white text-black font-semibold py-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
        >
          Ver en tienda
        </a>
      </div>
    </div>
  );
}

export default function SharedComboPage() {
  const params = useParams();
  const token = params?.token as string;

  const [combo, setCombo] = useState<ComboData | null>(null);
  const [styleIntent, setStyleIntent] = useState<{ style_tags?: string[]; budget_total?: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${AGENTS_URL}/share/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setCombo(data.current_render || null);
        setStyleIntent(data.style_intent || null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const entries = combo
    ? Object.entries(combo).filter(([, item]) => !item.no_stock && item.best)
    : [];

  const styleTags: string[] = styleIntent?.style_tags || [];
  const budget = styleIntent?.budget_total;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="flex items-center px-6 py-4 border-b border-neutral-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-white font-semibold tracking-tight text-lg">Stockfish</span>
          <span className="text-xs text-neutral-500 mt-0.5">decoración con IA</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {notFound && !loading && (
          <div className="text-center py-24">
            <p className="text-neutral-400 text-sm mb-6">Este diseño ya no está disponible.</p>
            <Link
              href="/chat"
              className="bg-white text-black text-sm font-semibold px-6 py-3 rounded-full hover:bg-neutral-200 transition-colors"
            >
              Crear mi propio combo
            </Link>
          </div>
        )}

        {!loading && !notFound && combo && (
          <>
            {/* Title */}
            <div className="mb-8">
              <p className="text-xs text-neutral-500 uppercase tracking-widest mb-2">Idea de decoración</p>
              <h1 className="text-2xl font-semibold text-white leading-snug">
                {styleTags.length > 0
                  ? `Combo ${styleTags.join(", ")}`
                  : "Combo de decoración"}
              </h1>
              {budget && (
                <p className="text-sm text-neutral-400 mt-1">
                  Presupuesto: {formatPrice(budget)}
                </p>
              )}
            </div>

            {/* Combo Grid */}
            {entries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
                {entries.map(([cat, item]) => (
                  <SharedComboCard key={cat} category={cat} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-neutral-400 text-sm mb-10">No hay productos disponibles en este combo.</p>
            )}

            {/* Total */}
            {entries.length > 0 && (
              <div className="mb-10 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl inline-flex gap-6">
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Productos</p>
                  <p className="text-white text-sm font-semibold">{entries.length}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Total estimado</p>
                  <p className="text-white text-sm font-semibold">
                    {formatPrice(entries.reduce((sum, [, item]) => sum + (item.best?.price || 0), 0))}
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="border border-neutral-800 rounded-2xl p-6 text-center">
              <p className="text-white font-semibold mb-1">¿Querés tu propio combo?</p>
              <p className="text-neutral-400 text-sm mb-5">
                Describí el estilo que buscás y la IA arma un combo con productos reales de tiendas argentinas.
              </p>
              <Link
                href="/chat"
                className="bg-white text-black text-sm font-semibold px-6 py-3 rounded-full hover:bg-neutral-200 transition-colors"
              >
                Probar Stockfish gratis →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
