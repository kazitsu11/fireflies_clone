"use client";

import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "./ThemeProvider";

export function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors position="bottom-right" theme={theme} />;
}
