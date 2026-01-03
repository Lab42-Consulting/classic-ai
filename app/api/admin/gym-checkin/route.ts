import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { generateDailyCode, getTimeUntilRotation } from "@/lib/checkin";

/**
 * GET /api/admin/gym-checkin
 * Get current check-in secret and stats
 * Admin only
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const gym = await prisma.gym.findUnique({
      where: { id: session.gymId },
      select: {
        checkinSecret: true,
      },
    });

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 });
    }

    // Get today's check-in stats
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayCheckins = await prisma.gymCheckin.count({
      where: {
        gymId: session.gymId,
        date: today,
      },
    });

    // Get total check-ins (all time)
    const totalCheckins = await prisma.gymCheckin.count({
      where: { gymId: session.gymId },
    });

    // Generate daily code from master secret
    const dailyCode = gym.checkinSecret
      ? generateDailyCode(gym.checkinSecret)
      : null;
    const rotation = getTimeUntilRotation();

    return NextResponse.json({
      hasSecret: !!gym.checkinSecret,
      dailyCode, // The code to display in QR (changes daily)
      nextRotation: rotation.formatted, // Time until code changes
      stats: {
        todayCheckins,
        totalCheckins,
      },
    });
  } catch (error) {
    console.error("Error fetching gym checkin settings:", error);
    return NextResponse.json(
      { error: "Greška pri učitavanju podešavanja" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/gym-checkin
 * Generate a new check-in secret
 * Admin only
 */
export async function POST() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Generate a new unique master secret
    const newSecret = uuidv4();

    const gym = await prisma.gym.update({
      where: { id: session.gymId },
      data: { checkinSecret: newSecret },
      select: { checkinSecret: true },
    });

    // Generate today's daily code from the new master secret
    const dailyCode = generateDailyCode(gym.checkinSecret!);
    const rotation = getTimeUntilRotation();

    return NextResponse.json({
      success: true,
      message: "Novi kod za prijavu je generisan",
      dailyCode,
      nextRotation: rotation.formatted,
    });
  } catch (error) {
    console.error("Error generating gym checkin secret:", error);
    return NextResponse.json(
      { error: "Greška pri generisanju koda" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/gym-checkin
 * Disable check-in (remove secret)
 * Admin only
 */
export async function DELETE() {
  try {
    const session = await getSession();

    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!staff || staff.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    await prisma.gym.update({
      where: { id: session.gymId },
      data: { checkinSecret: null },
    });

    return NextResponse.json({
      success: true,
      message: "Sistem prijave je deaktiviran",
    });
  } catch (error) {
    console.error("Error disabling gym checkin:", error);
    return NextResponse.json(
      { error: "Greška pri deaktivaciji" },
      { status: 500 }
    );
  }
}
