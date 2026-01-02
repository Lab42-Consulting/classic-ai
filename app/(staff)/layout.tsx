"use client";

import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/components/ui";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
