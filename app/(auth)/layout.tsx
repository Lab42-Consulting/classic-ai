export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages (login) don't use gym-specific theming
  // They always use default colors
  return <>{children}</>;
}
