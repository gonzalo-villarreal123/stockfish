import Link from 'next/link';

export default function VenderPage() {
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

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        <div className="inline-block bg-neutral-900 border border-neutral-700 text-neutral-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          Programa de Partners
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Convertí las búsquedas <br />
          <span className="text-gray-400">en tu nuevo canal de venta.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10">
          Stockfish es una plataforma de descubrimiento con IA. Conectamos a usuarios que describen su estilo ideal con los productos reales de tu catálogo. Sin buscadores tradicionales, pura intención de compra.
        </p>

        <a
          href="mailto:villarrealgonzalo.m@gmail.com?subject=Quiero sumar mi tienda a Stockfish"
          className="bg-white text-black px-8 py-3 rounded-full text-lg font-medium hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl"
        >
          Agendar una llamada
        </a>

        {/* Propuesta de Valor */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
          <div className="p-8 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-6">
              <span className="text-xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Audiencia Calificada</h3>
            <p className="text-gray-400 leading-relaxed">
              No pagues por clics vacíos. Los usuarios llegan a tus productos porque nuestra IA detectó que encajan exactamente con el estilo y espacio que están diseñando.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-6">
              <span className="text-xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Data de Intención</h3>
            <p className="text-gray-400 leading-relaxed">
              Entendé el mercado antes de fabricar. Te damos acceso a tableros dinámicos para ver qué colores, materiales y muebles está buscando tu audiencia.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center mb-6">
              <span className="text-xl">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Integración Simple</h3>
            <p className="text-gray-400 leading-relaxed">
              Conectamos tu catálogo a través de una API. Nosotros nos encargamos de indexar el estilo de cada producto para que la IA lo recomiende de manera orgánica.
            </p>
          </div>
        </div>

        {/* Sección de Autoridad */}
        <div className="mt-24 w-full p-8 md:p-12 rounded-3xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-8 text-left">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-white mb-4">¿Por qué sumarte ahora?</h2>
            <p className="text-gray-400">
              Estamos construyendo el futuro del e-commerce de decoración con estándares de nivel mundial y la experiencia de haber optimizado ventas en MercadoLibre. Queremos que las mejores marcas argentinas sean las primeras en aprovechar esta visibilidad.
            </p>
          </div>
          <a
            href="mailto:villarrealgonzalo.m@gmail.com?subject=Quiero sumar mi tienda a Stockfish"
            className="whitespace-nowrap bg-transparent border border-white text-white px-6 py-3 rounded-full font-medium hover:bg-white hover:text-black transition-colors"
          >
            Hablemos
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-800 text-center flex flex-col items-center text-sm text-gray-500">
        <p>© 2026 Stockfish. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
