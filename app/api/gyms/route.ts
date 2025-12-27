import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const gyms = await prisma.gym.findMany({
      select: {
        id: true,
        name: true,
        logo: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ gyms });
  } catch (error) {
    console.error("Get gyms error:", error);
    return NextResponse.json(
      { error: "Failed to get gyms" },
      { status: 500 }
    );
  }
}
