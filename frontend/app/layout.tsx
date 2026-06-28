import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";

import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider, type Theme } from "@/components/theme/ThemeProvider";
import { ThemedToaster } from "@/components/theme/ThemedToaster";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fireflies Clone — Meeting Notes & Transcripts",
  description:
    "AI meeting assistant: searchable transcripts, summaries, and action items.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme: Theme =
    (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full${theme === "dark" ? " dark" : ""}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider initialTheme={theme}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
