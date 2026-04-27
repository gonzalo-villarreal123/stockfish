"use client";

import { useState } from "react";
import Script from "next/script";

// ── Colores Foco (inline donde Tailwind no alcanza) ─────────
const C = {
  violet:     "#6366F1",
  violetDark: "#4F46E5",
  dark:       "#111827",
  gray:       "#6B7280",
  lightGray:  "#F9FAFB",
};

// ── Formspree: creá un form en formspree.io y pegá el ID acá
const FORMSPREE_ID = "xqewoppz"; // ← reemplazar con form ID de Foco

export default function ConsultoraPage() {
  const [modalOpen, setModalOpen]       = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [sending, setSending]           = useState(false);

  function openModal()  { setSubmitted(false); setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        body: new FormData(e.currentTarget),
        headers: { Accept: "application/json" },
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;900&family=Poppins:wght@400;600&display=swap');
        .foco-body { font-family: 'Poppins', sans-serif; color: ${C.dark}; }
        .foco-display { font-family: 'Inter', sans-serif; }
        .gradient-text {
          background: linear-gradient(90deg, ${C.violet}, #818CF8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-waves {
          position: absolute; bottom: 0; left: 0;
          width: 100%; height: 100%;
          z-index: 0; opacity: 0.1; pointer-events: none;
        }
        .foco-btn {
          background: ${C.violet}; color: #fff;
          font-weight: 700; padding: 12px 32px;
          border-radius: 8px; border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif;
          transition: background 0.2s;
          font-size: 1rem;
        }
        .foco-btn:hover { background: ${C.violetDark}; }
        .foco-btn-sm {
          background: ${C.violet}; color: #fff;
          font-weight: 600; padding: 8px 20px;
          border-radius: 8px; border: none; cursor: pointer;
          font-family: 'Poppins', sans-serif;
          transition: background 0.2s;
          font-size: 0.875rem;
        }
        .foco-btn-sm:hover { background: ${C.violetDark}; }
        .foco-input {
          width: 100%; padding: 10px 16px;
          border: 1px solid #D1D5DB; border-radius: 8px;
          font-family: 'Poppins', sans-serif; font-size: 14px;
          outline: none; transition: box-shadow 0.15s;
        }
        .foco-input:focus { box-shadow: 0 0 0 2px ${C.violet}44; border-color: ${C.violet}; }
      `}</style>

      {/* Font Awesome */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css"
        strategy="beforeInteractive"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css"
      />

      <div className="foco-body bg-white">

        {/* ── Header ── */}
        <header className="bg-white shadow-sm sticky top-0 z-40">
          <div className="container mx-auto px-6 py-3 flex justify-between items-center" style={{ maxWidth: 1200 }}>
            <a href="/consultora">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://i.ibb.co/h1hBKXfC/foco.png" alt="Foco" className="h-8" />
            </a>
            <nav className="hidden md:flex gap-8">
              {["#soluciones", "#metodologia", "#contacto"].map((href) => (
                <a key={href} href={href} style={{ color: C.gray, textDecoration: "none", fontSize: 15 }}
                   className="hover:text-indigo-500 transition">{href.replace("#", "").charAt(0).toUpperCase() + href.slice(2)}</a>
              ))}
            </nav>
            <button className="foco-btn-sm" onClick={openModal}>Agendar Diagnóstico</button>
          </div>
        </header>

        {/* ── Hero ── */}
        <main style={{ background: "#fff", position: "relative", overflow: "hidden" }}>
          <svg className="hero-waves" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.violet} />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            <path fill="url(#waveGrad)" fillOpacity="0.6" d="M0,160L48,160C96,160,192,160,288,149.3C384,139,480,117,576,128C672,139,768,181,864,181.3C960,181,1056,139,1152,122.7C1248,107,1344,117,1392,122.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
            <path fill="url(#waveGrad)" fillOpacity="0.3" d="M0,192L48,186.7C96,181,192,171,288,176C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,138.7C1248,117,1344,107,1392,101.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
          <div style={{ position: "relative", zIndex: 1, maxWidth: 1200 }}
               className="container mx-auto px-6 pt-24 pb-16 text-center">
            <h2 className="foco-display font-black mb-4" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.1 }}>
              Escala tu Operación,{" "}
              <br className="hidden md:block" />
              <span className="gradient-text">no tus Costos.</span>
            </h2>
            <p className="mx-auto mb-8" style={{ fontSize: "1.125rem", color: C.gray, maxWidth: 700 }}>
              Implementamos Equipos de IA Autónomos que se integran en el corazón de tu negocio
              para potenciar la eficiencia y acelerar el crecimiento.
            </p>
            <button className="foco-btn" style={{ fontSize: "1.125rem" }} onClick={openModal}>
              Solicitar Diagnóstico Gratuito
            </button>
          </div>
        </main>

        {/* ── Problema ── */}
        <section id="problema" style={{ background: C.lightGray }}>
          <div className="container mx-auto px-6 py-20" style={{ maxWidth: 1200 }}>
            <div className="text-center mb-12">
              <h3 className="foco-display font-bold" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
                ¿Tu equipo es talentoso, pero está atrapado en la operación diaria?
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              {[
                { icon: "fa-funnel-dollar", title: "Demanda Impredecible",  body: "Ciclos de venta largos y un flujo de clientes que sube y baja sin control, dificultando la planificación y el crecimiento." },
                { icon: "fa-cogs",          title: "Procesos Manuales",     body: "Tareas repetitivas que consumen el tiempo de tu mejor talento, generan errores costosos y frenan la agilidad de tu empresa." },
                { icon: "fa-chart-pie",     title: "Decisiones a Ciegas",   body: "Datos valiosos atrapados en silos, impidiendo una visión estratégica clara y forzando decisiones basadas en la intuición." },
              ].map((c) => (
                <div key={c.title} className="bg-white p-8 rounded-xl shadow-md">
                  <i className={`fas ${c.icon} text-4xl mb-4`} style={{ color: C.violet }} />
                  <h4 className="font-bold text-xl mb-2">{c.title}</h4>
                  <p style={{ color: C.gray }}>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Metodología ── */}
        <section id="metodologia">
          <div className="container mx-auto px-6 py-20" style={{ maxWidth: 1200 }}>
            <div className="text-center mb-12">
              <h3 className="foco-display font-bold" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
                Nuestra Solución: Unidades de Negocio Autónomas
              </h3>
            </div>
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2 text-center md:text-left">
                <p style={{ color: C.gray, marginBottom: 24 }}>
                  No te vendemos software, te entregamos un resultado. Implementamos un equipo de
                  expertos virtuales en tu empresa, entrenado para ejecutar procesos clave de principio
                  a fin, liberando a tu equipo humano para que se enfoque en la estrategia.
                </p>
                <a href="#soluciones" style={{ color: C.violet, fontWeight: 700, textDecoration: "none" }}>
                  Ver Células en Acción →
                </a>
              </div>
              <div className="md:w-1/2 w-full">
                <div className="p-6 rounded-lg text-center space-y-4" style={{ background: C.lightGray }}>
                  <div className="font-bold">Tu Objetivo de Negocio</div>
                  <div className="text-2xl" style={{ color: C.violet }}>↓</div>
                  <div className="p-4 rounded-md shadow-inner text-white" style={{ background: C.violet }}>
                    <h5 className="font-bold">Célula de IA Foco</h5>
                    <p className="text-sm">(Estratega + Ejecutor + Supervisor)</p>
                  </div>
                  <div className="text-2xl" style={{ color: C.violet }}>↓</div>
                  <div className="font-bold text-green-500">Resultado Medible</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Soluciones ── */}
        <section id="soluciones" style={{ background: C.lightGray }}>
          <div className="container mx-auto px-6 py-20" style={{ maxWidth: 1200 }}>
            <div className="text-center mb-12">
              <h3 className="foco-display font-bold" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
                Nuestras Células de IA en Acción
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Visibilidad Orgánica (SEO)",    body: "Una célula que investiga tu mercado, analiza a tu competencia y escribe contenido de alta calidad para posicionar tu marca en Google." },
                { title: "Construcción de Audiencia",     body: "Un equipo virtual que diseña tu estrategia de contenidos mensual y crea todas las publicaciones para redes sociales, listas para programar." },
                { title: "Generación de Oportunidades",  body: "Una unidad autónoma que prospecta, califica y redacta secuencias de contacto para llenar tu embudo de ventas con reuniones de calidad." },
              ].map((s) => (
                <div key={s.title} className="bg-white p-8 rounded-xl shadow-md">
                  <h4 className="foco-display font-bold text-2xl mb-3">{s.title}</h4>
                  <p style={{ color: C.gray }}>{s.body}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-12 text-lg" style={{ color: C.gray }}>
              <span style={{ fontWeight: 700, color: C.dark }}>Y esto es solo el comienzo.</span>{" "}
              Nuestro framework nos permite diseñar células a medida para resolver los desafíos únicos de tu negocio.
            </p>
          </div>
        </section>

        {/* ── Diferencial ── */}
        <section>
          <div className="container mx-auto px-6 py-20 text-center" style={{ maxWidth: 900 }}>
            <h3 className="foco-display font-bold" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
              La Tecnología es la Herramienta,{" "}
              <br />
              <span className="gradient-text">no el Objetivo.</span>
            </h3>
            <p className="mt-6 text-lg" style={{ color: C.gray }}>
              En Foco, nuestra obsesión no es la inteligencia artificial, es tu rentabilidad.
              Combinamos años de experiencia en estrategia de negocios con la vanguardia en
              automatización para diseñar soluciones que no solo son innovadoras, sino mediblemente
              rentables. Hablamos el idioma de tu directorio, no solo el de los ingenieros.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="contacto" style={{ background: C.dark }}>
          <div className="container mx-auto px-6 py-20 text-center text-white" style={{ maxWidth: 900 }}>
            <h3 className="foco-display font-bold" style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)" }}>
              ¿Listo para escalar tu eficiencia?
            </h3>
            <p className="mt-4 text-lg mx-auto" style={{ color: "#D1D5DB", maxWidth: 600 }}>
              Solicitá un Diagnóstico de Eficiencia Gratuito. En una sesión de 30 minutos, sin compromiso,
              analizaremos uno de sus procesos clave y te presentaremos un plan de acción claro.
            </p>
            <button className="foco-btn mt-8" style={{ fontSize: "1.125rem" }} onClick={openModal}>
              Agendar mi Diagnóstico Gratuito
            </button>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="bg-white">
          <div className="container mx-auto px-6 py-8 text-center" style={{ color: C.gray }}>
            <p>© 2025 Foco. Todos los derechos reservados.</p>
          </div>
        </footer>

        {/* ── Modal ── */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full relative" style={{ maxWidth: 480 }}>
              <button
                onClick={closeModal}
                className="absolute top-4 right-5 text-2xl leading-none"
                style={{ color: C.gray, background: "none", border: "none", cursor: "pointer" }}
              >
                ×
              </button>

              {submitted ? (
                <div className="text-center py-4">
                  <h3 className="foco-display font-bold text-2xl mb-4 text-green-500">¡Mensaje Enviado!</h3>
                  <p style={{ color: C.gray, marginBottom: 24 }}>
                    Gracias por contactarnos. Te respondemos a la brevedad para coordinar la sesión.
                  </p>
                  <button className="foco-btn-sm" onClick={closeModal}>Cerrar</button>
                </div>
              ) : (
                <>
                  <h3 className="foco-display font-bold text-2xl mb-2">Solicitar Diagnóstico Gratuito</h3>
                  <p style={{ color: C.gray, marginBottom: 24, fontSize: 14 }}>
                    Completá tus datos y nos pondremos en contacto a la brevedad.
                  </p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-sm">Nombre</label>
                      <input className="foco-input" name="nombre" type="text" placeholder="Tu nombre" required />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-sm">Email</label>
                      <input className="foco-input" name="email" type="email" placeholder="tu@email.com" required />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-sm">Teléfono (opcional)</label>
                      <input className="foco-input" name="telefono" type="tel" placeholder="+54 11..." />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-sm">Mensaje (opcional)</label>
                      <textarea
                        className="foco-input"
                        name="mensaje"
                        rows={3}
                        style={{ resize: "vertical" }}
                        placeholder="Contanos sobre tu negocio o el proceso que querés optimizar."
                      />
                    </div>
                    <button
                      type="submit"
                      className="foco-btn w-full"
                      disabled={sending}
                      style={{ opacity: sending ? 0.6 : 1 }}
                    >
                      {sending ? "Enviando..." : "Enviar Solicitud"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
