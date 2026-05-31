import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/components/i18n-provider";
import { CookieBanner } from "@/components/gdpr/cookie-banner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const isIndia = process.env.NEXT_PUBLIC_REGION === 'india'

export const metadata: Metadata = {
  title: isIndia
    ? "Tijori — Your Family's Financial Safe"
    : "Hale — Be Financially Hale",
  description: isIndia
    ? "Track EPF, SIPs, property and bank accounts. AI-powered financial wellness for India."
    : "Your complete financial health — tracked, scored and growing. Open Banking, AI insights, family finances.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: isIndia ? "Tijori" : "Hale",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <I18nProvider>{children}</I18nProvider>
          <CookieBanner />
        </SessionProvider>
      </body>
    </html>
  );
}
