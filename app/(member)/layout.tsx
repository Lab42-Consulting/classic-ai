"use client";

import { LocaleProvider } from "@/lib/locale-context";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
