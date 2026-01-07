import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGymTierInfo } from "@/lib/subscription/guards";

// GET /api/gym/tier-info - Get current gym's tier information
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get gymId from session (works for both staff and members)
    const gymId = session.gymId;

    if (!gymId) {
      return NextResponse.json(
        { error: "Gym not found in session" },
        { status: 400 }
      );
    }

    const tierInfo = await getGymTierInfo(gymId);

    if (!tierInfo) {
      return NextResponse.json(
        { error: "Gym not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tierInfo);
  } catch (error) {
    console.error("Get tier info error:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju informacija o paketu" },
      { status: 500 }
    );
  }
}
