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
  title:
    "Perseus Creative Studio | Leading Marketing Agency In Vancouver",
  description: "Leading Media & Web Development Agency In Vancouver",
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
        </body>
      </ReactLenis>
    </html>
  );
}
