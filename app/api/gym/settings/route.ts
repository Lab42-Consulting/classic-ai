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
      select: {
        id: true,
        name: true,
        logo: true,
        settings: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        subscribedAt: true,
        subscribedUntil: true,
        primaryColor: true,
      },
    });

    if (!gym) {
      return NextResponse.json({ settings: {} });
    }

    // Parse settings as GymSettings (it's stored as JSON)
    // Merge primaryColor into settings so theme context can use it
    const baseSettings = gym.settings as GymSettings;
    const settings: GymSettings = {
      ...baseSettings,
      // Use primaryColor from gym model if set, otherwise fall back to settings.accentColor
      accentColor: gym.primaryColor || baseSettings?.accentColor,
    };

    // If user is staff, include staff data and gym stats
    if (session.userType === "staff") {
      const staff = await prisma.staff.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      // Get gym stats
      const [totalMembers, activeMembers, totalStaff, coaches] = await Promise.all([
        prisma.member.count({ where: { gymId: session.gymId } }),
        prisma.member.count({
          where: {
            gymId: session.gymId,
            subscriptionStatus: "active",
          },
        }),
        prisma.staff.count({ where: { gymId: session.gymId } }),
        prisma.staff.count({
          where: {
            gymId: session.gymId,
            role: { equals: "coach", mode: "insensitive" },
          },
        }),
      ]);

      return NextResponse.json({
        settings,
        gym: {
          id: gym.id,
          name: gym.name,
          logo: gym.logo,
          subscriptionStatus: gym.subscriptionStatus,
          subscriptionTier: gym.subscriptionTier,
          subscribedAt: gym.subscribedAt,
          subscribedUntil: gym.subscribedUntil,
          primaryColor: gym.primaryColor,
        },
        staff,
        stats: {
          totalMembers,
          activeMembers,
          totalStaff,
          coaches,
        },
      });
    }

    // For members, return settings and basic gym info (logo, name)
    return NextResponse.json({
      settings,
      gym: {
        name: gym.name,
        logo: gym.logo,
      },
    });
  } catch (error) {
    console.error("Error fetching gym settings:", error);
    return NextResponse.json({ settings: {} });
  }
}
