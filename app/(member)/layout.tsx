"use client";

import { LocaleProvider } from "@/lib/locale-context";
import { MemberProvider } from "@/lib/member-context";
import { ThemeProvider } from "@/lib/theme-context";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { ToastProvider } from "@/components/ui";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <MemberProvider>
          <ToastProvider>
            <SubscriptionGuard>{children}</SubscriptionGuard>
          </ToastProvider>
        </MemberProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
