import type { Metadata } from "next";
import "./globals.css";
import ReferralCapture from "../components/ReferralCapture";

export const metadata: Metadata = {
  title: "Stockfish — Decorá con IA",
  description: "Encontrá productos de decoración que combinan con tu espacio.",
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
