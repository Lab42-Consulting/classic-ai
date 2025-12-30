"use client";

import { LocaleProvider } from "@/lib/locale-context";
import { ThemeProvider } from "@/lib/theme-context";
import { SubscriptionGuard } from "@/components/subscription-guard";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <SubscriptionGuard>{children}</SubscriptionGuard>
      </LocaleProvider>
    </ThemeProvider>
  );
}
