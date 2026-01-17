import type { Metadata } from "next";

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import { extractRouterConfig } from "uploadthing/server";

import { SEO_CONFIG } from "~/app";
import { ourFileRouter } from "~/app/api/uploadthing/core";
import { AuthProvider } from "~/lib/hooks/use-auth";
import { CartProvider } from "~/lib/hooks/use-cart";
import "~/css/globals.css";
import { Footer } from "~/ui/components/footer";
import { Header } from "~/ui/components/header/header";
import { ThemeProvider } from "~/ui/components/theme-provider";
import { Toaster } from "~/ui/primitives/sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: SEO_CONFIG.fullName,
    template: `%s | ${SEO_CONFIG.name}`,
  },
  description: SEO_CONFIG.description,
  keywords: SEO_CONFIG.keywords,
  authors: [{ name: SEO_CONFIG.name }],
  creator: SEO_CONFIG.name,
  publisher: SEO_CONFIG.name,
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  icons: {
    icon: [
      { url: "/team-fav.png", sizes: "32x32", type: "image/png" },
      { url: "/team-fav.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/team-fav.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/team-fav.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SEO_CONFIG.siteUrl,
    siteName: SEO_CONFIG.name,
    title: SEO_CONFIG.fullName,
    description: SEO_CONFIG.description,
    images: [
      {
        url: "/team-fav.png",
        width: 512,
        height: 512,
        alt: SEO_CONFIG.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_CONFIG.fullName,
    description: SEO_CONFIG.description,
    images: ["/team-fav.png"],
    creator: "@soccerlocker",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          min-h-screen bg-gradient-to-br from-white to-slate-100
          text-neutral-900 antialiased
          selection:bg-primary/80
          dark:from-neutral-950 dark:to-neutral-900 dark:text-neutral-100
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          <AuthProvider>
            <CartProvider>
              <Header showAuth={true} />
              <main className={`flex min-h-screen flex-col`}>{children}</main>
              <Footer />
              <Toaster />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
