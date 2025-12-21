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
  title: "Perseus Creative Studio - Build a Brand People Love",
  description:
    "Perseus Creative Studio is a trusted digital marketing agency in Vancouver experts in social media marketing, website design, photography, videography, SEO.",
  keywords: ["Digital Marketing Agency Vancouver"],

  openGraph: {
    title: "Perseus Creative Studio - Build a Brand People Love",
    description:
      "Perseus Creative Studio is a trusted digital marketing agency in Vancouver experts in social media marketing, website design, photography, videography, SEO.",
    url: "https://www.perseustudio.com",
    siteName: "Perseus Creative Studio",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://ik.imagekit.io/perseus/logo-black.png",
        width: 1200,
        height: 630,
        alt: "Perseus Creative Studio Home Page Preview",
      },
    ],
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
