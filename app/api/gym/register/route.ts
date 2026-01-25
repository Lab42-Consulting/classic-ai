import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateStaffId, generatePin, hashPin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      gymName,
      ownerName,
      ownerEmail,
      phone,
      address,
      primaryColor,
      logo,
    } = body;

    // Validate required fields
    if (!gymName || !ownerName || !ownerEmail || !phone) {
      return NextResponse.json(
        { error: "Sva obavezna polja moraju biti popunjena" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      return NextResponse.json(
        { error: "Nevalidna email adresa" },
        { status: 400 }
      );
    }

    // Check if gym with same email already exists
    const existingGym = await prisma.gym.findFirst({
      where: { ownerEmail },
    });

    if (existingGym) {
      return NextResponse.json(
        { error: "Teretana sa ovom email adresom već postoji" },
        { status: 400 }
      );
    }

    // Generate admin credentials
    const staffId = generateStaffId();
    const pin = generatePin();
    const hashedPin = await hashPin(pin);

    // Create gym and admin staff in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create gym with pending subscription status
      const gym = await tx.gym.create({
        data: {
          name: gymName,
          ownerName,
          ownerEmail,
          phone,
          address: address || null,
          primaryColor: primaryColor || "#ef4444",
          logo: logo || null,
          subscriptionStatus: "pending", // Will be activated after payment
          settings: {
            accentColor: primaryColor || "#ef4444",
          },
        },
      });

      // Create first owner staff member (owner = super admin with cross-gym access)
      const staff = await tx.staff.create({
        data: {
          staffId,
          pin: hashedPin,
          name: ownerName,
          role: "owner",
          gymId: gym.id,
        },
      });

      // Log the gym creation
      await tx.subscriptionLog.create({
        data: {
          entityType: "gym",
          entityId: gym.id,
          action: "created",
          notes: `Gym "${gymName}" registered by ${ownerName}`,
          performedByType: "system",
        },
      });

      return { gym, staff, plainPin: pin };
    });

    return NextResponse.json({
      success: true,
      gym: {
        id: result.gym.id,
        name: result.gym.name,
      },
      admin: {
        staffId: result.staff.staffId,
        pin: result.plainPin, // Only returned once, during registration
        name: result.staff.name,
      },
    });
  } catch (error) {
    console.error("Gym registration error:", error);
    return NextResponse.json(
      { error: "Greška pri registraciji teretane" },
      { status: 500 }
    );
  }
}
