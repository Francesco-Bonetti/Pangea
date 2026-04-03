import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agora — Pangea Democratic Platform",
  description:
    "The digital democracy platform of the Global Democratic Republic of Pangea. Propose, debate, deliberate.",
  keywords: ["democracy", "vote", "proposals", "Pangea", "Agora", "digital"],
  openGraph: {
    title: "Agora — Pangea",
    description: "Propose laws, vote, build global democracy.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0c1220]">{children}</body>
    </html>
  );
}
