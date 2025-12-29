import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { GymSettings } from "@/lib/types/gym";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      // Return default settings for unauthenticated users
      return NextResponse.json({ settings: {} });
    }

    const gym = await prisma.gym.findUnique({
      where: { id: session.gymId },
      select: { settings: true },
    });

    if (!gym) {
      return NextResponse.json({ settings: {} });
    }

    // Parse settings as GymSettings (it's stored as JSON)
    const settings = gym.settings as GymSettings;

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching gym settings:", error);
    return NextResponse.json({ settings: {} });
  }
}
