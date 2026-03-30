import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Pocket DM — Combat Tracker D&D 5e",
  description: "O combat tracker definitivo para mestres de D&D 5e. Iniciativa, HP e condições em tempo real.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pocket DM",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <div id="floating-cards-root" />
      </body>
    </html>
  );
}
