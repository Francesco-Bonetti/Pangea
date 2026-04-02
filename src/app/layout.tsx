import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://v0-agora-pangea-dashboard.vercel.app"),
  title: {
    default: "Agora Pangea — Democrazia Digitale Globale",
    template: "%s | Agora Pangea",
  },
  description:
    "Agora Pangea è la piattaforma di democrazia digitale della Repubblica Democratica Globale Pangea. Proponi leggi, vota proposte, delega il tuo voto e partecipa al primo governo democratico globale.",
  keywords: [
    "democrazia digitale",
    "voto online",
    "proposte di legge",
    "democrazia liquida",
    "partecipazione civica",
    "Pangea",
    "Agora",
    "e-democracy",
    "governo globale",
  ],
  authors: [{ name: "Pangea" }],
  openGraph: {
    title: "Agora Pangea — Democrazia Digitale Globale",
    description:
      "Proponi leggi, vota, delega il tuo voto a esperti e partecipa alla prima democrazia digitale globale.",
    type: "website",
    url: "https://v0-agora-pangea-dashboard.vercel.app",
    siteName: "Agora Pangea",
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agora Pangea — Democrazia Digitale Globale",
    description:
      "Proponi leggi, vota, delega il tuo voto a esperti e partecipa alla prima democrazia digitale globale.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
