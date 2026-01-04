import { NextResponse } from "next/server";
import { getMemberFromSession, getMemberAuthErrorMessage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  validateImageUpload,
  processImageUpload,
  deleteImage,
} from "@/lib/storage";

export async function PATCH(request: Request) {
  try {
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { avatarUrl } = body;

    // Validate image before processing
    const validation = validateImageUpload(avatarUrl, "avatar");
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Get current avatar URL for cleanup
    const currentMember = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: { avatarUrl: true },
    });

    // Process image upload (handles base64 -> blob conversion)
    const imageResult = await processImageUpload(
      avatarUrl,
      "avatar",
      authResult.memberId,
      currentMember?.avatarUrl
    );

    if (imageResult.error) {
      return NextResponse.json({ error: imageResult.error }, { status: 400 });
    }

    // Update member avatar with blob URL
    const updatedMember = await prisma.member.update({
      where: { id: authResult.memberId },
      data: { avatarUrl: imageResult.url },
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
    const authResult = await getMemberFromSession();

    if ("error" in authResult) {
      return NextResponse.json(
        { error: getMemberAuthErrorMessage(authResult.error), code: authResult.error },
        { status: 401 }
      );
    }

    // Get current avatar URL to delete from blob storage
    const member = await prisma.member.findUnique({
      where: { id: authResult.memberId },
      select: { avatarUrl: true },
    });

    // Delete from blob storage
    if (member?.avatarUrl) {
      await deleteImage(member.avatarUrl);
    }

    // Update database
    await prisma.member.update({
      where: { id: authResult.memberId },
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
