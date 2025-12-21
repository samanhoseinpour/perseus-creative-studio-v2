import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactLenis } from "./utils/lenis";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

import {
  Navbar,
  Footer,
  ScrollProgress,
  BgGradient,
  SpotLight,
} from "./components";

const interFont = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: "Perseus | Branding & Digital Agency in Vancouver",
  description:
    "Perseus Creative Studio Vancouver | we craft custom-design websites, videographies, and growth strategies to scale your online presence",
  openGraph: {
    title: "Perseus | Branding & Digital Agency in Vancouver",
    description:
      "Perseus Creative Studio Vancouver | we craft custom-design websites, videographies, and growth strategies to scale your online presence",
    url: "/",
    siteName: "Perseus Creative Studio",
    images: [
      {
        url: "https://ik.imagekit.io/perseus/logo-black.png",
        width: 1200,
        height: 630,
        alt: "Perseus Creative Studio",
        type: "image/png",
      },
    ],
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Perseus | Branding & Digital Agency in Vancouver",
    description:
      "Perseus Creative Studio Vancouver | we craft custom-design websites, videographies, and growth strategies to scale your online presence",
    images: ["/logo-white.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Perseus" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/lenis@1.3.4/dist/lenis.css"
        />
      </head>
      <ReactLenis root>
        <body className={`${interFont.className} antialiased`}>
          <ScrollProgress />
          <BgGradient />
          <Navbar />
          {children}
          <Footer />
          <SpotLight
            className="bg-zinc-700 blur-2xl"
            size={64}
            springOptions={{
              bounce: 0.3,
              duration: 0.1,
            }}
          />
          <Toaster position="top-right" />
        </body>
      </ReactLenis>
      <SpeedInsights />
      <Analytics />
    </html>
  );
}
