import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const siteTitle = "Pocket DM — Rastreador de Combate D&D 5e | Combat Tracker";
const siteDescription =
  "O rastreador de combate definitivo para mestres de D&D 5e. Iniciativa, HP, condições e oráculo de magias em tempo real — grátis, no celular dos seus jogadores. Free D&D 5e combat tracker.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: siteTitle,
    template: "%s | Pocket DM",
  },
  description: siteDescription,
  keywords: [
    "combat tracker",
    "D&D 5e",
    "rastreador de combate",
    "iniciativa D&D",
    "gerenciador de combate RPG",
    "ferramentas para mestre de RPG",
    "app para mestre de RPG",
    "dnd combat tracker",
    "initiative tracker",
    "encounter tracker",
    "combat tracker presencial",
    "Pocket DM",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pocket DM",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? [process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION]
        : [],
    },
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/blog/rss",
    },
    languages: {
      "pt-BR": "/",
      en: "/",
    },
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: "Pocket DM",
    type: "website",
    locale: "pt_BR",
    alternateLocale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Pocket DM — Rastreador de Combate D&D 5e",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#D4A853",
};

const cinzel = localFont({
  src: [
    { path: "../public/fonts/cinzel-latin-400-normal.woff2", weight: "400" },
    { path: "../public/fonts/cinzel-latin-600-normal.woff2", weight: "600" },
    { path: "../public/fonts/cinzel-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-cinzel",
  display: "swap",
});

const jakarta = localFont({
  src: "../public/fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = localFont({
  src: "../public/fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        className={`${cinzel.variable} ${jakarta.variable} ${jetbrains.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <Analytics />
        <Toaster richColors position="top-right" />
<div id="floating-cards-root" />
      </body>
    </html>
  );
}
