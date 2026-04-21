import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Subís tu tienda",
    body: "Pegás la URL de tu Tienda Nube. Indexamos todo el catálogo automáticamente — fotos, precios, descripciones.",
  },
  {
    n: "02",
    title: "El widget se activa",
    body: "Pegás un snippet de una línea en tu tienda. Un asistente IA aparece para tus clientes, sin configuración.",
  },
  {
    n: "03",
    title: "Tus clientes compran",
    body: "Buscan por estilo, encuentran lo que buscaban, lo agregan al carrito. Vos ves todo en tu dashboard.",
  },
];

const VALUE = [
  {
    icon: "↗",
    title: "Más conversiones",
    body: "Un cliente que sabe lo que quiere convierte 3× más que uno navegando filtros.",
  },
  {
    icon: "◎",
    title: "Insights reales",
    body: "Qué buscan tus clientes, qué no encuentran, qué tienen en el catálogo que no saben que existe.",
  },
  {
    icon: "⚡",
    title: "Live en minutos",
    body: "Sin integración compleja. Un script. Tu catálogo indexado. Widget funcionando.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans selection:bg-gray-700">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto border-b border-gray-800">
        <div className="text-xl font-bold text-white tracking-tight">
          Stockfish
          <span className="text-gray-500 font-normal text-sm ml-2">para tiendas de deco</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/lanzamiento" className="text-gray-500 hover:text-white transition-colors">
            Para compradores
          </Link>
          <Link
            href="/alta"
            className="bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Darme de alta →
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6">

        {/* Hero */}
        <section className="pt-24 pb-20 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-700 text-neutral-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Gratis durante el piloto
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Tu tienda de deco.<br />
            <span className="text-gray-400">Con asistente de IA.</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            Tus clientes describen lo que buscan con palabras naturales.
            La IA encuentra los productos de <strong className="text-gray-200">tu catálogo</strong> que mejor encajan.
            Vos ves qué buscan y qué no encuentran.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/alta"
              className="bg-white text-black px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
            >
              Darme de alta gratis →
            </Link>
            <Link
              href="/widget/altorancho"
              target="_blank"
              className="border border-gray-700 text-gray-300 px-8 py-4 rounded-full text-lg font-medium hover:border-gray-500 hover:text-white transition-all"
            >
              Ver demo en vivo
            </Link>
          </div>
          <p className="text-sm text-gray-600 mt-4">Sin tarjeta de crédito. Live en minutos.</p>
        </section>

        {/* Cómo funciona */}
        <section className="pb-24">
          <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-12">Cómo funciona</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="p-6 rounded-2xl bg-[#141414] border border-gray-800">
                <div className="text-4xl font-black text-gray-800 mb-4">{s.n}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Demo visual del widget */}
        <section className="pb-24">
          <div className="rounded-3xl bg-[#141414] border border-gray-800 overflow-hidden">
            <div className="px-8 pt-10 pb-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Lo que ven tus clientes</p>
              <h2 className="text-2xl font-bold text-white mb-2">Un asistente que entiende lo que buscan</h2>
              <p className="text-gray-400 text-sm max-w-xl mx-auto">
                No más filtros de categoría que nadie usa. Tus clientes escriben lo que quieren y aparecen los productos de <em>tu</em> tienda.
              </p>
            </div>

            {/* Chat mockup */}
            <div className="max-w-sm mx-auto mb-8 px-4">
              <div className="bg-[#0a0a0a] rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-xs text-gray-500 font-medium">Asistente de tu tienda</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {/* User message */}
                  <div className="self-end bg-[#1a1a1a] border border-gray-800 rounded-2xl rounded-br-sm px-4 py-2 text-sm text-gray-300 max-w-[80%]">
                    Quiero armar un living nórdico con presupuesto de $300.000
                  </div>
                  {/* Bot response */}
                  <div className="text-sm text-gray-400 max-w-[90%]">
                    ¡Perfecto! Armé un combo nórdico con productos de tu tienda:
                  </div>
                  {/* Product cards mockup */}
                  <div className="flex flex-col gap-2">
                    {[
                      { cat: "Iluminación", name: "Velador Luna Natural", price: "$84.900" },
                      { cat: "Textiles", name: "Almohadón Lino Beige", price: "$42.000" },
                    ].map((p) => (
                      <div key={p.name} className="bg-[#141414] border border-gray-800 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-500">{p.cat}</div>
                          <div className="text-xs text-gray-200 font-medium truncate">{p.name}</div>
                          <div className="text-xs text-white font-semibold">{p.price}</div>
                        </div>
                        <div className="text-xs text-gray-600 border border-gray-800 rounded-lg px-2 py-1">↺</div>
                      </div>
                    ))}
                  </div>
                  {/* Input mockup */}
                  <div className="mt-2 bg-[#111] border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-600">
                    Ajustá el estilo, presupuesto o una categoría…
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Valor para el merchant */}
        <section className="pb-24">
          <p className="text-xs text-gray-500 uppercase tracking-widest text-center mb-12">Lo que recibís</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUE.map((v) => (
              <div key={v.title} className="flex flex-col gap-3 p-6 rounded-2xl bg-[#141414] border border-gray-800">
                <span className="text-2xl text-white">{v.icon}</span>
                <h3 className="text-lg font-semibold text-white">{v.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard preview */}
        <section className="pb-24">
          <div className="rounded-3xl bg-[#141414] border border-gray-800 p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Dashboard de insights</p>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Sabés exactamente qué buscan tus clientes
                </h2>
                <ul className="flex flex-col gap-3">
                  {[
                    "Top búsquedas de la semana",
                    "Categorías más pedidas",
                    "Qué no encuentran (gaps de catálogo)",
                    "Export CSV para tu equipo",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="w-4 h-4 rounded-full bg-green-900 border border-green-700 flex items-center justify-center text-green-400 text-xs flex-shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Stats mockup */}
              <div className="flex-1 w-full">
                <div className="bg-[#0a0a0a] rounded-2xl border border-gray-800 p-5 flex flex-col gap-4">
                  <div className="flex gap-3">
                    {[
                      { label: "Búsquedas", val: "247" },
                      { label: "Sesiones", val: "183" },
                      { label: "Sin stock", val: "12%" },
                    ].map((s) => (
                      <div key={s.label} className="flex-1 bg-[#141414] border border-gray-800 rounded-xl p-3">
                        <div className="text-xl font-bold text-white">{s.val}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-2">Top búsquedas</div>
                    {[
                      { q: "living nórdico con madera", n: 38 },
                      { q: "velador forma de hongo", n: 27 },
                      { q: "alfombra beige grande", n: 19 },
                    ].map((item) => (
                      <div key={item.q} className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 bg-gray-800 rounded h-1.5">
                          <div
                            className="h-full bg-indigo-500 rounded"
                            style={{ width: `${(item.n / 38) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-24 truncate">{item.q}</span>
                        <span className="text-xs text-gray-600 w-5 text-right">{item.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Piloto activo */}
        <section className="pb-24">
          <div className="p-6 rounded-2xl bg-[#141414] border border-gray-800 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-10 h-10 rounded-full bg-green-900 border border-green-700 flex items-center justify-center text-green-400 text-lg flex-shrink-0">
              ✓
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Piloto activo</div>
              <div className="text-white font-semibold">Alto Rancho — 148 productos indexados</div>
              <div className="text-gray-400 text-sm">Widget live, clientes buscando, métricas en tiempo real.</div>
            </div>
            <Link
              href="/widget/altorancho"
              target="_blank"
              className="text-sm border border-gray-700 text-gray-400 px-4 py-2 rounded-full hover:border-gray-500 hover:text-white transition-colors whitespace-nowrap"
            >
              Ver widget →
            </Link>
          </div>
        </section>

        {/* CTA final */}
        <section className="pb-24">
          <div className="rounded-3xl bg-white text-black p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              ¿Tu tienda es de home decor?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
              Estamos en piloto con tiendas Tienda Nube. El alta es gratis y lleva menos de 5 minutos.
            </p>
            <Link
              href="/alta"
              className="inline-block bg-black text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-900 transition-all shadow-lg"
            >
              Darme de alta gratis →
            </Link>
            <p className="text-gray-400 text-sm mt-4">Sin tarjeta. Sin contrato. Salís del piloto cuando quieras.</p>
          </div>
        </section>

      </main>

      <footer className="max-w-5xl mx-auto px-6 py-10 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
        <p>© 2026 Stockfish</p>
        <div className="flex gap-6">
          <Link href="/lanzamiento" className="hover:text-white transition-colors">Para compradores</Link>
          <Link href="/alta" className="hover:text-white transition-colors">Darme de alta</Link>
          <Link href="/widget/altorancho" target="_blank" className="hover:text-white transition-colors">Ver demo</Link>
        </div>
      </footer>

    </div>
  );
}
