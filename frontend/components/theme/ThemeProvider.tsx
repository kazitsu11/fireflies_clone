"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

const COOKIE = "theme";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

/**
 * Theme is persisted in a cookie (read server-side in the root layout so there's
 * no flash) — not localStorage, which isn't reliable in this environment.
 * The toggle flips the `dark` class on <html> immediately for instant feedback.
 */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
