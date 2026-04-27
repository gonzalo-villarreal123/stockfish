import type { Metadata } from "next";
import "./globals.css";
import ReferralCapture from "../components/ReferralCapture";

const APP_URL = "https://stockfish.ar";
const OG_IMAGE = `${APP_URL}/og.png`;

export const metadata: Metadata = {
  title: "Stockfish — El vendedor IA para tu tienda de deco",
  description:
    "Widget de IA embebible para tiendas de home decor. Tus clientes buscan en lenguaje natural, la IA encuentra productos de tu catálogo y arma combos coordinados. Live en menos de una hora.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "Stockfish",
    title: "Stockfish — El vendedor IA para tu tienda de deco",
    description:
      "Widget IA para tiendas de home decor en Argentina. Tus clientes buscan en lenguaje natural, la IA encuentra productos de tu catálogo. $100 USD/mes. Sin contrato.",
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
