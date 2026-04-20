import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans selection:bg-gray-700">

      {/* Navegación */}
      <header className="flex items-center justify-between p-6 max-w-5xl mx-auto border-b border-gray-800">
        <div className="text-xl font-bold text-white tracking-wide">
          Stockfish <span className="text-gray-500 font-normal text-sm ml-2">decoración con IA</span>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/vender" className="hover:text-white transition-colors">
            Para Vendedores
          </Link>
          <Link href="/chat" className="bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors">
            Probar IA
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Encontrá tu estilo.<br />
          <span className="text-gray-400">Sin usar filtros.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10">
          Describí lo que estás buscando con tus propias palabras. Nuestra IA busca en las mejores tiendas de Argentina y te muestra cómo queda en tu espacio.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/chat" className="bg-white text-black px-8 py-3 rounded-full text-lg font-medium hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl">
            Iniciar chat con Stockfish
          </Link>
        </div>

        {/* Ejemplos de Prompts */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-600 transition-colors">
            <p className="text-sm text-gray-500 mb-2">Búsqueda exacta</p>
            <p className="text-gray-300">"Busco un sillón nórdico de dos cuerpos, color gris oscuro, para un depto chico."</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-600 transition-colors">
            <p className="text-sm text-gray-500 mb-2">Inspiración de estilo</p>
            <p className="text-gray-300">"Quiero armar un rincón de lectura cálido. Tengo piso de madera clara y mucha luz natural."</p>
          </div>
          <div className="p-6 rounded-2xl bg-[#141414] border border-gray-800 hover:border-gray-600 transition-colors">
            <p className="text-sm text-gray-500 mb-2">Visualización (Próximamente)</p>
            <p className="text-gray-300">"Tengo esta mesa ratona, ¿qué alfombra de menos de $100.000 le quedaría bien?"</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-gray-800 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
        <p>© 2026 Stockfish. Todos los derechos reservados.</p>
        <div className="mt-4 md:mt-0 space-x-4">
          <Link href="/vender" className="hover:text-white">Sumá tu tienda</Link>
        </div>
      </footer>
    </div>
  );
}
