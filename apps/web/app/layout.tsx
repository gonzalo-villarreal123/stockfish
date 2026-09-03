import type { Metadata } from "next";
import "./globals.css";
import ReferralCapture from "../components/ReferralCapture";

const APP_URL = "https://focobusiness.com";

export const metadata: Metadata = {
  title: "Foco — Consultora de Negocios con Ejecución Autónoma",
  description:
    "Diseñamos tu estrategia de negocio y la ejecutamos con equipos de IA autónomos integrados en el corazón de tu operación. No solo te decimos qué hacer: lo hacemos.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "Foco",
    title: "Foco — Consultora de Negocios con Ejecución Autónoma",
    description:
      "Escala tu operación, no tus costos. Estrategia de negocio diseñada por consultores y ejecutada por equipos de IA autónomos.",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foco — Escala tu Operación, no tus Costos.",
    description:
      "Consultoría de negocios que diseña la estrategia y la ejecuta con equipos de IA autónomos.",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "consultoría de negocios Argentina",
    "automatización con IA",
    "equipos de IA autónomos",
    "eficiencia operativa",
    "automatización de procesos",
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
