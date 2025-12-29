"use client";

import { ThemeProvider } from "@/lib/theme-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
