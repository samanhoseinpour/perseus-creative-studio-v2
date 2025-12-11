import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { ReactLenis } from "./utils/lenis";

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
  title: "Perseus Creative Studio | Leading Marketing Agency In Vancouver",
  description: "Leading Media & Web Development Agency In Vancouver",
  openGraph: {
    title: "Perseus Creative Studio | Leading Marketing Agency In Vancouver",
    description: "Leading Media & Web Development Agency In Vancouver",
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
    title: "Perseus Creative Studio | Leading Marketing Agency In Vancouver",
    description: "Leading Media & Web Development Agency In Vancouver",
    images: ["/logo-white.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        </body>
      </ReactLenis>
    </html>
  );
}
