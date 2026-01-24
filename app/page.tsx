import { redirect } from "next/navigation";

export default async function RootPage() {
  // Root URL shows the public gym portal (marketing website)
  redirect("/gym-portal");
}
