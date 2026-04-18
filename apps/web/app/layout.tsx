import type { Metadata } from "next";
import "./globals.css";
import ReferralCapture from "../components/ReferralCapture";

const APP_URL = "https://stockfish.ar";
const OG_IMAGE = `${APP_URL}/og.png`;

export const metadata: Metadata = {
  title: "Stockfish — Decorá con IA",
  description:
    "Describí tu espacio con tus propias palabras. Nuestra IA busca en las mejores tiendas de Argentina y te arma el combo perfecto. Sin filtros, sin perder tiempo.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "Stockfish",
    title: "Stockfish — Encontrá tu estilo. Sin usar filtros.",
    description:
      "Describí cómo querés decorar tu espacio y la IA te arma el combo de productos ideales. Gratis. Para Argentina.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Stockfish — Decoración con IA para Argentina",
      },
    ],
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stockfish — Encontrá tu estilo. Sin usar filtros.",
    description:
      "Describí cómo querés decorar y la IA te arma el combo perfecto de muebles y deco de tiendas argentinas.",
    images: [OG_IMAGE],
    creator: "@stockfish_ar",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "decoración argentina",
    "muebles con IA",
    "decoración inteligente",
    "home decor Argentina",
    "buscar muebles IA",
    "decoración living",
    "combo decoración",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ReferralCapture />
        {children}
      </body>
    </html>
  );
}
