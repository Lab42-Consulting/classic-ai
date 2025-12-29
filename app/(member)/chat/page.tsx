import { redirect } from "next/navigation";

// Redirect /chat to /home since agents are displayed on the home page
export default function ChatPage() {
  redirect("/home");
}
