import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classic Method - Gym Portal",
  description: "Power your gym with the Classic Method intelligence system",
};

export default function GymPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
