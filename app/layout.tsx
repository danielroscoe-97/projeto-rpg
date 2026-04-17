import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { WebVitalsTracker } from "@/components/analytics/WebVitalsTracker";
import { ErrorTrackingProvider } from "@/components/ErrorTrackingProvider";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || "/";

const siteTitle = "Pocket DM — Combat & Initiative Tracker D&D 5e | Rastreador de Combate";
const siteTitleSocial = "Pocket DM — Master your table.";
const siteDescription =
  "O combat & initiative tracker definitivo para mestres de D&D 5e. Iniciativa, HP, condições e oráculo de magias em tempo real — grátis, no celular dos seus jogadores. Free D&D 5e combat & initiative tracker.";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: siteTitle,
    template: "%s | Pocket DM",
  },
  description: siteDescription,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
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
    title: siteTitleSocial,
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
        alt: "Pocket DM — Master your table.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitleSocial,
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
        <ErrorTrackingProvider />
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <Analytics />
        <WebVitalsTracker />
        <Toaster richColors position="top-right" />
<div id="floating-cards-root" />
      </body>
    </html>
  );
}
