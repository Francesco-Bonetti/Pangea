import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agora — Pangea Democratic Platform",
  description:
    "La piattaforma di democrazia digitale della Repubblica Democratica Globale Pangea. Proponi, dibatti, delibera.",
  keywords: ["democrazia", "voto", "proposte", "Pangea", "Agora", "digitale"],
  openGraph: {
    title: "Agora — Pangea",
    description: "Proponi leggi, vota, costruisci la democrazia globale.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className="min-h-screen bg-[#0c1220]">{children}</body>
    </html>
  );
}
