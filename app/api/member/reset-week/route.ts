import { NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * POST /api/member/reset-week
 * Resets the member's week tracking to start fresh
 * This affects consistency score calculation
 */
export async function POST() {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Update the member's weekResetAt to now
    const updatedMember = await prisma.member.update({
      where: { id: authResult.memberId },
      data: { weekResetAt: new Date() },
      select: {
        id: true,
        weekResetAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Nedelja uspešno resetovana",
      weekResetAt: updatedMember.weekResetAt,
    });
  } catch (error) {
    console.error("Error resetting week:", error);
    return NextResponse.json(
      { error: "Greška pri resetovanju nedelje" },
      { status: 500 }
    );
  }
}
