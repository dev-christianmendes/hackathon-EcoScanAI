import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "EcoScan AI — Descarte Inteligente",
  description:
    "Use inteligência artificial para identificar resíduos e aprender o descarte correto. Tecnologia a serviço do meio ambiente.",
  keywords: ["reciclagem", "IA", "sustentabilidade", "resíduos", "meio ambiente"],
  authors: [{ name: "EcoScan Team" }],
  openGraph: {
    title: "EcoScan AI",
    description: "Identifique resíduos e descarte corretamente com IA",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-eco-dark text-white antialiased">
        {children}
      </body>
    </html>
  );
}
