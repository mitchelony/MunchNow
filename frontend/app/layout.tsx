import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Providers } from "./providers";
import PageViewTracker from "./PageViewTracker";
import RouteTransition from "./RouteTransition";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MunchHSV - What's worth it right now?",
  description: "Find the best places to eat in Huntsville, voted by students.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const stored = localStorage.getItem("munch_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored ?? (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jakarta.variable} min-h-screen antialiased`}
      >
        <Providers>
          <Suspense fallback={null}>
            <PageViewTracker />
          </Suspense>
          <RouteTransition>{children}</RouteTransition>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
