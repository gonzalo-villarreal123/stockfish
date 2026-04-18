import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stockfish — Decorá tu espacio con IA",
  description:
    "Describí tu espacio con tus propias palabras y la IA te arma el combo perfecto de muebles y deco de tiendas argentinas. Gratis, sin registro.",
  openGraph: {
    title: "Stockfish — El buscador de deco que entiende español",
    description:
      "Sin filtros, sin catálogos interminables. Describí lo que querés y la IA arma tu combo en segundos. Probalo gratis.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stockfish — El buscador de deco que entiende español",
    description:
      "Sin filtros, sin catálogos interminables. Describí lo que querés y la IA arma tu combo en segundos.",
    images: ["/og.png"],
  },
};

export default function LanzamientoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
