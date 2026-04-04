import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/Toast";
import { LanguageProvider } from "@/components/language-provider";
import BugReportButton from "@/components/BugReportButton";
import AiAssistant from "@/components/AiAssistant";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "700"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "Pangea — Global Democratic Platform",
  description:
    "The digital democracy platform of the Global Democratic Commonwealth of Pangea. Propose, debate, deliberate.",
  keywords: ["democracy", "vote", "proposals", "Pangea", "pangea.vote", "digital"],
  openGraph: {
    title: "Pangea — Global Democracy",
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
    <html
      lang="en"
      className={`${inter.variable} ${merriweather.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <ToastProvider>
              {children}
              <AiAssistant />
              <BugReportButton />
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
