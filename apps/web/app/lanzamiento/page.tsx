"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const SOCIAL_PROOF = [
  { quote: "Describí un living nórdico gris y en 30 segundos me armó el combo completo con precios reales.", name: "Valentina R.", city: "Buenos Aires" },
  { quote: "Busqué sillón de dos cuerpos para depto chico y me mostró opciones que nunca hubiera encontrado con filtros.", name: "Matías G.", city: "Córdoba" },
  { quote: "Lo usé para un cliente y quedaron fascinados. La IA entiende el estilo mejor que cualquier buscador.", name: "Lucía P.", city: "Rosario" },
];

const FEATURES = [
  {
    icon: "✦",
    title: "Describí en tus palabras",
    body: "Nada de filtros complicados. Escribí «quiero un living cálido con madera y mucha luz» y listo.",
  },
  {
    icon: "⚡",
    title: "Combo listo en segundos",
    body: "La IA busca en tiendas reales argentinas y te arma un set coordinado: sillón, mesa, alfombra, iluminación.",
  },
  {
    icon: "↺",
    title: "Swipeá hasta encontrarlo",
    body: "¿No te convence un producto? Clic en «cambiar» y aparece otra opción dentro del mismo estilo y presupuesto.",
  },
];

function LanzamientoContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Capture UTM from URL
  const utm = {
    utm_source: searchParams.get("utm_source") ?? undefined,
    utm_medium: searchParams.get("utm_medium") ?? undefined,
    utm_campaign: searchParams.get("utm_campaign") ?? undefined,
    utm_content: searchParams.get("utm_content") ?? undefined,
    ref: searchParams.get("ref") ?? undefined,
  };

  // Fire campaign_landing analytics on mount
  useEffect(() => {
    if (utm.utm_campaign || utm.utm_source) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).posthog?.capture("campaign_landing_lanzamiento", utm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setErrorMsg("Ingresá un email válido.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...utm }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al registrar");
      }

      setStatus("success");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).posthog?.capture("waitlist_signup", { email, ...utm });
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Algo salió mal. Intentá de nuevo.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans selection:bg-gray-700">

      {/* Nav */}
      <header className="flex items-center justify-between p-6 max-w-5xl mx-auto border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-white tracking-wide hover:opacity-80 transition-opacity">
          Stockfish{" "}
          <span className="text-gray-500 font-normal text-sm ml-2">decoración con IA</span>
        </Link>
        <Link
          href="/chat"
          className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Probar gratis →
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6">

        {/* Hero */}
        <section className="py-20 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-700 text-neutral-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Disponible ahora · Gratis
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
            El buscador de deco<br />
            <span className="text-gray-400">que entiende español.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            Describí tu espacio como si le hablaras a un amigo. Nuestra IA busca en las mejores tiendas argentinas y te arma un combo de productos reales, coordinados, con precio.
          </p>

          {/* CTA principal */}
          <Link
            href="/chat"
            className="bg-white text-black px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl mb-4"
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (window as any).posthog?.capture("lanzamiento_cta_click", { position: "hero", ...utm });
            }}
          >
            Probalo gratis — sin registro
          </Link>
          <p className="text-sm text-gray-600">No necesitás cuenta. Solo describí lo que buscás.</p>
        </section>

        {/* Demo visual — ejemplo de prompts */}
        <section className="pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Living escandinavo", desc: "«Living nórdico, tonos beige y madera clara, depto de 50m²»" },
              { label: "Dormitorio minimalista", desc: "«Cuarto minimalista en blanco y negro, sin muchas cosas»" },
              { label: "Home office con estilo", desc: "«Home office cálido, estante para libros y buena iluminación»" },
            ].map((ex) => (
              <div key={ex.label} className="p-5 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-600 transition-colors">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">{ex.label}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{ex.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="pb-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-3">
              <span className="text-2xl text-white">{f.icon}</span>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Social proof */}
        <section className="pb-24">
          <h2 className="text-center text-2xl font-bold text-white mb-10">
            Lo que dicen los que ya lo usaron
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {SOCIAL_PROOF.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-[#141414] border border-gray-800 flex flex-col gap-4">
                <p className="text-gray-300 text-sm leading-relaxed">"{t.quote}"</p>
                <div>
                  <p className="text-white text-sm font-medium">{t.name}</p>
                  <p className="text-gray-600 text-xs">{t.city}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Email capture */}
        <section className="pb-24">
          <div className="max-w-xl mx-auto p-8 md:p-12 rounded-3xl bg-neutral-900 border border-neutral-800 text-center">
            {status === "success" ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-900/50 border border-green-700 flex items-center justify-center text-green-400 text-xl">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-white">¡Estás anotado!</h3>
                <p className="text-gray-400 text-sm">
                  Te vamos a avisar cuando haya novedades. Mientras tanto, podés probar la IA ahora mismo.
                </p>
                <Link
                  href="/chat"
                  className="mt-2 bg-white text-black px-8 py-3 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Probalo ahora →
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Enterate de todo lo nuevo
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Nuevas tiendas, nuevas categorías, visualización de espacios. Dejá tu email y te avisamos primero.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="flex-1 bg-neutral-800 border border-neutral-700 text-white px-4 py-3 rounded-xl text-sm placeholder-neutral-500 outline-none focus:border-neutral-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="bg-white text-black px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {status === "loading" ? "Anotando..." : "Anotarme"}
                  </button>
                </form>
                {errorMsg && (
                  <p className="mt-3 text-sm text-red-400">{errorMsg}</p>
                )}
                <p className="mt-4 text-xs text-neutral-600">
                  Sin spam. Solo novedades de Stockfish.
                </p>
              </>
            )}
          </div>
        </section>

        {/* Final CTA para vendedores */}
        <section className="pb-24">
          <div className="p-8 rounded-2xl bg-[#141414] border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Para tiendas de decoración</p>
              <h3 className="text-xl font-bold text-white mb-2">¿Tenés una tienda de deco?</h3>
              <p className="text-gray-400 text-sm">
                Sumá tu catálogo y llegá a compradores que ya saben lo que quieren. Sin pagar por clics vacíos.
              </p>
            </div>
            <Link
              href="/vender"
              className="whitespace-nowrap border border-white text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-white hover:text-black transition-colors"
            >
              Conocer el programa →
            </Link>
          </div>
        </section>

      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-800 text-center text-sm text-gray-600">
        <p>© 2026 Stockfish. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default function LanzamientoPage() {
  return (
    <Suspense>
      <LanzamientoContent />
    </Suspense>
  );
}
