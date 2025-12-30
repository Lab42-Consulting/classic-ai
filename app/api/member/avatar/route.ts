import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Maximum avatar size: 500KB (base64 encoded images can be large)
const MAX_AVATAR_SIZE = 500 * 1024;

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("gym-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload || payload.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { avatarUrl } = body;

    // Validate avatar URL format (should be a base64 data URL)
    if (avatarUrl !== null && avatarUrl !== undefined) {
      if (typeof avatarUrl !== "string") {
        return NextResponse.json(
          { error: "Invalid avatar format" },
          { status: 400 }
        );
      }

      // Check if it's a valid data URL
      if (!avatarUrl.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Avatar must be an image" },
          { status: 400 }
        );
      }

      // Check size limit
      if (avatarUrl.length > MAX_AVATAR_SIZE) {
        return NextResponse.json(
          { error: "Avatar too large. Max 500KB." },
          { status: 400 }
        );
      }

      // Validate image type
      const validTypes = ["data:image/jpeg", "data:image/png", "data:image/webp"];
      if (!validTypes.some(type => avatarUrl.startsWith(type))) {
        return NextResponse.json(
          { error: "Avatar must be JPEG, PNG, or WebP" },
          { status: 400 }
        );
      }
    }

    // Update member avatar
    const updatedMember = await prisma.member.update({
      where: { id: payload.userId },
      data: { avatarUrl: avatarUrl || null },
      select: { avatarUrl: true },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: updatedMember.avatarUrl,
    });
  } catch (error) {
    console.error("Error updating avatar:", error);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove avatar
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("gym-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload || payload.userType !== "member") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.member.update({
      where: { id: payload.userId },
      data: { avatarUrl: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing avatar:", error);
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    );
  }
}
