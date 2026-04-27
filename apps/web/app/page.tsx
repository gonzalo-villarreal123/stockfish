import Link from "next/link";

// ── Data ──────────────────────────────────────────────────

const STATS = [
  { val: "38,5%", label: "de los merchants ya ve las compras conducidas por agentes de IA como factor determinante en 2026" },
  { val: "50,4%", label: "cree que la atención al cliente con IA será la tendencia de mayor impacto este año" },
  { val: "80%",   label: "de los consumidores ya usa respuestas de IA para decidir su compra" },
];

const STEPS = [
  {
    n: "01",
    title: "Indexamos tu catálogo",
    body: "Le pasamos la URL de tu tienda. El sistema importa todos tus productos automáticamente — fotos, precios, descripciones.",
  },
  {
    n: "02",
    title: "Pegás un snippet",
    body: "Una línea de código en el HTML de tu tienda. El widget aparece flotando en la esquina. Lo hacemos nosotros.",
  },
  {
    n: "03",
    title: "Tus clientes buscan",
    body: "Describen lo que quieren. La IA muestra productos de tu catálogo coordinados por estilo y presupuesto.",
  },
];

const FEATURES = [
  {
    icon: "🤖",
    title: "Asistente IA en tu tienda",
    body: "Entiende estilo, presupuesto y ambiente. Arma combos coordinados con productos reales de tu catálogo.",
  },
  {
    icon: "📊",
    title: "Dashboard de qué buscan",
    body: "Ves en tiempo real qué buscan tus clientes, qué categorías piden más y qué no encuentran.",
  },
  {
    icon: "🎯",
    title: "Gaps de catálogo",
    body: '"Tus clientes buscan veladores estilo hongo y no tenés ninguno." Datos para comprar mejor.',
  },
  {
    icon: "🔗",
    title: "Combos compartibles",
    body: "El cliente arma su combo y lo comparte por WhatsApp. Marketing gratuito para tu marca.",
  },
];

const PILOTS = [
  { name: "Alto Rancho", products: 322, active: true },
  { name: "Sol Palou",   products: 83,  active: false },
  { name: "Lufe",        products: 53,  active: false },
  { name: "Holyhaus",    products: 45,  active: false },
  { name: "Pacify",      products: 19,  active: false },
];

const PRICE_ITEMS = [
  "Widget IA embebido en tu tienda",
  "Catálogo indexado automáticamente",
  "Dashboard de insights en tiempo real",
  "Export de datos (CSV)",
  "Combos compartibles por WhatsApp",
  "Soporte directo",
];

// ── Page ──────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen text-gray-200 font-sans selection:bg-gray-700" style={{ background: "#161616" }}>

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto border-b border-white/[0.07]">
        <div className="text-xl font-bold text-white tracking-tight">
          Stockfish
          <span className="text-gray-500 font-normal text-sm ml-2">para tiendas de deco</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/widget/altorancho" target="_blank" className="text-gray-500 hover:text-white transition-colors hidden sm:block">
            Ver demo
          </Link>
          <Link
            href="/alta"
            className="bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors text-sm"
          >
            Empezar →
          </Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6">

        {/* ── Hero ── */}
        <section className="pt-24 pb-20 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 border border-white/10 text-gray-400 px-4 py-1.5 rounded-full text-xs font-medium mb-8 tracking-wide uppercase" style={{ background: "#1f1f1f" }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Widget IA para tiendas de decoración
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
            El comercio agentivo<br />
            llegó.<br />
            <span style={{ color: "#a0a0a0" }}>¿Tu tienda está lista?</span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mb-10 leading-relaxed" style={{ color: "#a8a8a8" }}>
            Tus clientes ya usan IA para decidir qué comprar.
            Stockfish pone esa IA <strong className="text-gray-200">adentro de tu tienda</strong> —
            busca en tu catálogo, arma combos coordinados y conecta directo al carrito.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/alta"
              className="bg-white text-black px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              Empezar ahora →
            </Link>
            <Link
              href="/widget/altorancho"
              target="_blank"
              className="border text-gray-300 px-8 py-4 rounded-full text-lg font-medium hover:text-white transition-all"
              style={{ borderColor: "#2e2e2e" }}
            >
              Ver demo en vivo
            </Link>
          </div>
          <p className="text-sm mt-4" style={{ color: "#555" }}>Live en menos de una hora. Sin contrato.</p>
        </section>

        {/* ── Contexto de mercado ── */}
        <section className="pb-24">
          <div className="rounded-3xl border p-8 md:p-12" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
            <p className="text-xs uppercase tracking-widest text-center mb-2" style={{ color: "#606060" }}>El momento</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3 tracking-tight">
              El ecommerce está cambiando.<br />
              <span style={{ color: "#7c74ff" }}>Más rápido de lo que parece.</span>
            </h2>

            <blockquote className="my-8 border-l-4 pl-6 py-2 italic text-lg leading-relaxed max-w-3xl mx-auto" style={{ borderColor: "#7c74ff", color: "#ddd" }}>
              &ldquo;En este escenario de comercio agentivo, los consumidores delegan cada vez más decisiones
              en asistentes inteligentes que actúan como intermediarios digitales, disponibles 24/7.&rdquo;
              <cite className="block mt-3 text-sm not-italic" style={{ color: "#666" }}>
                — NubeCommerce 2026, Tienda Nube Argentina
              </cite>
            </blockquote>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              {STATS.map((s) => (
                <div key={s.val} className="rounded-2xl p-6 border" style={{ background: "#222", borderColor: "#2e2e2e" }}>
                  <div className="text-4xl font-black mb-2" style={{ color: "#7c74ff" }}>{s.val}</div>
                  <p className="text-sm leading-relaxed" style={{ color: "#999" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Problema ── */}
        <section className="pb-24">
          <p className="text-xs uppercase tracking-widest text-center mb-4" style={{ color: "#606060" }}>El problema</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4 tracking-tight">
            Tus clientes llegan.<br />
            <span style={{ color: "#a0a0a0" }}>Pero no encuentran lo que buscan.</span>
          </h2>
          <p className="text-center max-w-2xl mx-auto mb-12 text-lg leading-relaxed" style={{ color: "#a8a8a8" }}>
            Los filtros de categoría no entienden &ldquo;quiero un living nórdico cálido para un depto chico&rdquo;.
            El cliente se frustra y se va. Vos perdés la venta aunque el producto estaba en tu catálogo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: "01", title: "Cliente llega a tu tienda",  body: "Sabe lo que quiere pero no sabe cómo buscarlo con filtros." },
              { n: "02", title: "Navega sin encontrar",       body: "Los filtros de categoría no entienden lenguaje natural ni estilo." },
              { n: "03", title: "Se va sin comprar",          body: "La venta se pierde. El producto estaba en tu catálogo." },
            ].map((s) => (
              <div key={s.n} className="p-6 rounded-2xl border" style={{ background: "#1f1f1f", borderColor: "#2e2e2e" }}>
                <div className="text-3xl font-black mb-4" style={{ color: "#2a2a2a" }}>{s.n}</div>
                <h3 className="text-base font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#a0a0a0" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section className="pb-24">
          <p className="text-xs uppercase tracking-widest text-center mb-4" style={{ color: "#606060" }}>La solución</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-3 tracking-tight">
            Stockfish.<br />
            <span style={{ color: "#7c74ff" }}>El vendedor IA de tu tienda.</span>
          </h2>
          <p className="text-center max-w-xl mx-auto mb-12 text-lg leading-relaxed" style={{ color: "#a8a8a8" }}>
            Live en menos de una hora.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="p-6 rounded-2xl border" style={{ background: "#1f1f1f", borderColor: "#2e2e2e" }}>
                <div className="text-4xl font-black mb-4" style={{ color: "#2a2a2a" }}>{s.n}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#a0a0a0" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Demo visual del widget ── */}
        <section className="pb-24">
          <div className="rounded-3xl border overflow-hidden" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
            <div className="px-8 pt-10 pb-6 text-center">
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#606060" }}>Lo que ven tus clientes</p>
              <h2 className="text-2xl font-bold text-white mb-2">Un asistente que entiende lo que buscan</h2>
              <p className="text-sm max-w-xl mx-auto" style={{ color: "#a8a8a8" }}>
                No más filtros que nadie usa. Tus clientes escriben lo que quieren y aparecen los productos de <em>tu</em> tienda.
              </p>
            </div>

            {/* Chat mockup */}
            <div className="max-w-sm mx-auto mb-8 px-4">
              <div className="rounded-2xl border overflow-hidden" style={{ background: "#141414", borderColor: "#2a2a2a" }}>
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "#2a2a2a" }}>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs font-medium" style={{ color: "#666" }}>Asistente de tu tienda</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div className="self-end rounded-2xl rounded-br-sm px-4 py-2 text-sm max-w-[80%]" style={{ background: "#222", border: "1px solid #333", color: "#e0e0e0" }}>
                    Quiero armar un living nórdico con presupuesto de $300.000
                  </div>
                  <div className="text-sm max-w-[90%]" style={{ color: "#a0a0a0" }}>
                    ¡Perfecto! Armé un combo nórdico con productos de tu tienda:
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { cat: "Iluminación", name: "Velador Luna Natural", price: "$84.900" },
                      { cat: "Textil Hogar", name: "Almohadón Lino Beige", price: "$42.000" },
                    ].map((p) => (
                      <div key={p.name} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "#1e1e1e", border: "1px solid #2e2e2e" }}>
                        <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: "#2a2a2a" }}></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs" style={{ color: "#606060" }}>{p.cat}</div>
                          <div className="text-xs font-medium truncate" style={{ color: "#e0e0e0" }}>{p.name}</div>
                          <div className="text-xs font-semibold text-white">{p.price}</div>
                        </div>
                        <div className="text-xs rounded-lg px-2 py-1" style={{ color: "#666", border: "1px solid #2e2e2e" }}>↺</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 rounded-xl px-3 py-2 text-xs" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555" }}>
                    Ajustá el estilo, presupuesto o una categoría…
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Lo que recibís ── */}
        <section className="pb-24">
          <p className="text-xs uppercase tracking-widest text-center mb-4" style={{ color: "#606060" }}>Lo que recibís</p>
          <h2 className="text-3xl font-bold text-white text-center mb-3 tracking-tight">
            El widget.<br />
            <span style={{ color: "#a0a0a0" }}>Y algo más valioso todavía.</span>
          </h2>
          <p className="text-center max-w-xl mx-auto mb-12 text-lg leading-relaxed" style={{ color: "#a8a8a8" }}>
            Ya no se trata solo de un chat. Stockfish actúa como una extensión de tu negocio.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 p-6 rounded-2xl border" style={{ background: "#1f1f1f", borderColor: "#2e2e2e" }}>
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#a0a0a0" }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dashboard preview ── */}
        <section className="pb-24">
          <div className="rounded-3xl border p-8 md:p-12" style={{ background: "#1c1c1c", borderColor: "#2a2a2a" }}>
            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#606060" }}>Dashboard de insights</p>
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Sabés exactamente qué buscan tus clientes
                </h2>
                <ul className="flex flex-col gap-3">
                  {[
                    "Top búsquedas de la semana",
                    "Categorías más pedidas",
                    "Qué no encuentran (gaps de catálogo)",
                    "Export CSV para tu equipo",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm" style={{ color: "#a8a8a8" }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-green-400 text-xs flex-shrink-0" style={{ background: "#1a3a1a", border: "1px solid #2a5a2a" }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-2xl border p-5 flex flex-col gap-4" style={{ background: "#141414", borderColor: "#2a2a2a" }}>
                  <div className="flex gap-3">
                    {[
                      { label: "Búsquedas", val: "247" },
                      { label: "Sesiones",  val: "183" },
                      { label: "Sin stock", val: "12%" },
                    ].map((s) => (
                      <div key={s.label} className="flex-1 rounded-xl p-3 border" style={{ background: "#1e1e1e", borderColor: "#2e2e2e" }}>
                        <div className="text-xl font-bold text-white">{s.val}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#666" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs mb-2" style={{ color: "#666" }}>Top búsquedas</div>
                    {[
                      { q: "living nórdico con madera", n: 38 },
                      { q: "velador forma de hongo",    n: 27 },
                      { q: "alfombra beige grande",     n: 19 },
                    ].map((item) => (
                      <div key={item.q} className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 rounded h-1.5" style={{ background: "#2a2a2a" }}>
                          <div className="h-full rounded" style={{ width: `${(item.n / 38) * 100}%`, background: "#7c74ff" }} />
                        </div>
                        <span className="text-xs w-24 truncate" style={{ color: "#666" }}>{item.q}</span>
                        <span className="text-xs w-5 text-right" style={{ color: "#555" }}>{item.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tracción ── */}
        <section className="pb-24">
          <p className="text-xs uppercase tracking-widest text-center mb-4" style={{ color: "#606060" }}>Tracción</p>
          <h2 className="text-3xl font-bold text-white text-center mb-3 tracking-tight">
            Ya funciona.<br />
            <span style={{ color: "#7c74ff" }}>En tiendas reales.</span>
          </h2>
          <p className="text-center max-w-xl mx-auto mb-10 text-lg leading-relaxed" style={{ color: "#a8a8a8" }}>
            No es un prototipo. Es un producto en producción con catálogos reales de tiendas argentinas.
          </p>
          <div className="flex flex-col gap-3">
            {PILOTS.map((p) => (
              <div key={p.name} className="flex items-center justify-between px-6 py-4 rounded-2xl border" style={{ background: "#1f1f1f", borderColor: "#2e2e2e" }}>
                <div className="flex items-center gap-3">
                  {p.active && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />}
                  {!p.active && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#2e2e2e" }} />}
                  <span className="font-medium text-white">{p.name}</span>
                  {p.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#1a3a1a", border: "1px solid #2a5a2a", color: "#6ee36e" }}>piloto activo</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm" style={{ color: "#666" }}>{p.products} productos</span>
                  {p.active && (
                    <Link
                      href={`/widget/${p.name.toLowerCase().replace(" ", "")}`}
                      target="_blank"
                      className="text-xs border px-3 py-1.5 rounded-full transition-colors hover:text-white"
                      style={{ color: "#888", borderColor: "#2e2e2e" }}
                    >
                      Ver widget →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="pb-24">
          <p className="text-xs uppercase tracking-widest text-center mb-4" style={{ color: "#606060" }}>Inversión</p>
          <h2 className="text-3xl font-bold text-white text-center mb-12 tracking-tight">
            Simple. Predecible.<br />
            <span style={{ color: "#a0a0a0" }}>Sin sorpresas.</span>
          </h2>
          <div className="max-w-md mx-auto">
            <div className="bg-white text-black rounded-3xl p-10">
              <div className="text-xs uppercase tracking-widest text-gray-400 mb-4">Plan Pro</div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-6xl font-black leading-none">$100</span>
                <span className="text-xl text-gray-500 pb-1">USD / mes</span>
              </div>
              <p className="text-sm text-gray-500 mb-8">Sin contrato. Sin permanencia. Cancelás cuando quieras.</p>
              <ul className="flex flex-col gap-3 mb-8">
                {PRICE_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/alta"
                className="block w-full text-center bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-900 transition-colors"
              >
                Empezar ahora →
              </Link>
            </div>
            <p className="text-center text-sm mt-4" style={{ color: "#555" }}>
              Si el widget te cierra una sola venta por mes, ya pagó el año entero.
            </p>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="pb-24">
          <div className="rounded-3xl bg-white text-black p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
              ¿Tu tienda es de home decor?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Probalo en vivo en la tienda de Alto Rancho o hablemos para mostrarte cómo quedaría en la tuya.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/alta"
                className="bg-black text-white px-10 py-4 rounded-full text-lg font-semibold hover:bg-gray-900 transition-all shadow-lg"
              >
                Empezar ahora →
              </Link>
              <Link
                href="/widget/altorancho"
                target="_blank"
                className="border border-gray-300 text-gray-700 px-8 py-4 rounded-full text-lg font-medium hover:border-gray-500 transition-all"
              >
                Ver demo en vivo
              </Link>
            </div>
            <p className="text-gray-400 text-sm mt-4">focobusiness.com · hola@focobusiness.com</p>
          </div>
        </section>

      </main>

      <footer className="max-w-5xl mx-auto px-6 py-10 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-sm" style={{ borderColor: "#222", color: "#555" }}>
        <p>© 2026 Stockfish · focobusiness.com</p>
        <div className="flex gap-6">
          <Link href="/widget/altorancho" target="_blank" className="hover:text-white transition-colors">Ver demo</Link>
          <Link href="/alta" className="hover:text-white transition-colors">Empezar</Link>
        </div>
      </footer>

    </div>
  );
}
