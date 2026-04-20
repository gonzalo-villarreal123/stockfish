"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function VenderPage() {
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    url_tienda: "",
    plataforma: "Tienda Nube",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const { error } = await supabase.from("merchant_leads").insert([
        {
          nombre: form.nombre,
          email: form.email,
          url_tienda: form.url_tienda,
          plataforma: form.plataforma,
        },
      ]);
      if (error) throw error;
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans selection:bg-gray-700">

      {/* Header */}
      <header className="flex items-center justify-between p-6 max-w-5xl mx-auto border-b border-gray-800">
        <Link href="/" className="text-xl font-bold text-white tracking-wide hover:opacity-80 transition-opacity">
          Stockfish <span className="text-gray-500 font-normal text-sm ml-2">para tiendas</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className="hover:text-white transition-colors">
            Volver al inicio
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6">

        {/* ── Hero ── */}
        <section className="py-24 flex flex-col items-center text-center">
          <div className="inline-block bg-neutral-900 border border-neutral-700 text-neutral-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            Widget de IA para tiendas de deco
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Tu tienda habla con cada cliente.{" "}
            <span className="text-gray-400">Ellos eligen, vos vendés.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10">
            Stockfish es un asistente de decoración con IA que se instala en tu tienda con un solo script.
            Entiende el estilo del comprador, busca en tu catálogo y recomienda productos que convierten.
          </p>
          <button
            onClick={scrollToForm}
            className="bg-white text-black px-8 py-3 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
          >
            Quiero el widget
          </button>
        </section>

        {/* ── How it works ── */}
        <section className="py-16 border-t border-gray-800">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Cómo funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Instalás un script",
                desc: "Pegás una línea de código en tu tienda. Sin cambios en tu diseño, sin configuración compleja.",
              },
              {
                step: "02",
                title: "El comprador describe su estilo",
                desc: "Un chat flotante le pregunta cómo quiere decorar su espacio. Texto libre, sin filtros.",
              },
              {
                step: "03",
                title: "La IA recomienda tus productos",
                desc: "Busca solo en tu catálogo y presenta los artículos más afines. El usuario agrega al carrito.",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                className="p-8 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="text-4xl font-black text-neutral-700 mb-4">{step}</div>
                <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Social proof ── */}
        <section className="py-16 border-t border-gray-800">
          <div className="p-8 md:p-12 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-block bg-green-950 border border-green-800 text-green-400 px-3 py-1 rounded-full text-xs font-medium mb-4">
                Piloto activo
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                Ya integrado con Altorancho
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Altorancho fue la primera tienda en instalar el widget. Su catálogo completo — más de 1.300 productos —
                ya está indexado y disponible para búsqueda semántica en tiempo real.
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto">
              <a
                href="https://stockfish.ar/widget/altorancho"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center border border-gray-600 text-gray-300 px-6 py-3 rounded-full text-sm font-medium hover:border-white hover:text-white transition-colors"
              >
                Ver demo en vivo →
              </a>
            </div>
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="py-16 border-t border-gray-800">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Por qué sumarte ahora
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: "⚡",
                title: "Cero esfuerzo dev",
                desc: "Un solo script tag. Sin integraciones, sin APIs, sin modificar tu tema.",
              },
              {
                icon: "🎯",
                title: "Solo busca en tu catálogo",
                desc: "La IA no recomienda productos de la competencia. Trabaja exclusivamente con tus artículos.",
              },
              {
                icon: "📈",
                title: "Compradores que convierten más",
                desc: "Quien llega al widget ya sabe qué quiere. La recomendación personalizada acelera la decisión de compra.",
              },
              {
                icon: "🎁",
                title: "Gratis durante el piloto",
                desc: "Sin costo hasta que el producto esté validado. Queremos tiendas que crezcan con nosotros.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="p-8 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-700 transition-colors flex gap-5"
              >
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">
                  {icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Install snippet ── */}
        <section className="py-16 border-t border-gray-800">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
            Una línea de código
          </h2>
          <p className="text-center text-gray-400 mb-8 text-sm">
            Pegalo en el{" "}
            <code className="text-gray-300 bg-neutral-800 px-1.5 py-0.5 rounded text-xs">&lt;head&gt;</code>{" "}
            o antes del cierre del{" "}
            <code className="text-gray-300 bg-neutral-800 px-1.5 py-0.5 rounded text-xs">&lt;body&gt;</code>{" "}
            de tu tienda.
          </p>
          <div className="max-w-2xl mx-auto bg-neutral-900 border border-neutral-700 rounded-2xl p-6 font-mono text-sm overflow-x-auto">
            <pre className="text-green-400 whitespace-pre-wrap break-all">{`<script
  src="https://focobusiness.com/embed.js"
  data-merchant="tu-tienda">
</script>`}</pre>
          </div>
        </section>

        {/* ── Contact form ── */}
        <section ref={formRef} className="py-16 border-t border-gray-800">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
              Quiero el widget
            </h2>
            <p className="text-center text-gray-400 mb-10 text-sm">
              Completá el formulario y te contactamos en 48hs.
            </p>

            {status === "success" ? (
              <div className="p-8 rounded-2xl bg-green-950 border border-green-800 text-center">
                <div className="text-3xl mb-3">✓</div>
                <p className="text-green-300 font-medium text-lg mb-1">¡Listo!</p>
                <p className="text-green-400 text-sm">Te contactamos en 48hs.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500 transition-colors placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tu@tienda.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500 transition-colors placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">URL de tu tienda</label>
                  <input
                    type="url"
                    required
                    placeholder="https://tutienda.com"
                    value={form.url_tienda}
                    onChange={(e) => setForm({ ...form, url_tienda: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500 transition-colors placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Plataforma</label>
                  <select
                    value={form.plataforma}
                    onChange={(e) => setForm({ ...form, plataforma: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-500 transition-colors appearance-none"
                  >
                    <option>Tienda Nube</option>
                    <option>Shopify</option>
                    <option>WooCommerce</option>
                    <option>Otra</option>
                  </select>
                </div>

                {status === "error" && (
                  <p className="text-red-400 text-sm text-center">
                    Hubo un error al enviar. Escribinos directamente a{" "}
                    <a
                      href="mailto:gonzalo.villarreal@mercadolibre.com?subject=Quiero el widget de Stockfish"
                      className="underline"
                    >
                      gonzalo.villarreal@mercadolibre.com
                    </a>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-2 bg-white text-black px-8 py-3 rounded-full font-semibold text-sm hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? "Enviando..." : "Quiero el widget →"}
                </button>
              </form>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-800 text-center flex flex-col items-center text-sm text-gray-500">
        <p>© 2026 Stockfish. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
