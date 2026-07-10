import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { validateImageUpload, processImageUpload } from "@/lib/storage";

/**
 * POST /api/admin/products/image
 * Upload a product image (base64 data URL) to Vercel Blob and return its URL.
 * Admin + owner only. Keeps large images out of Postgres for the storefront.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.userType !== "staff") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { id: session.userId },
      select: { role: true, gymId: true },
    });
    if (!staff || !["owner", "admin"].includes(staff.role.toLowerCase())) {
      return NextResponse.json({ error: "Admin or owner access required" }, { status: 403 });
    }

    const body = await request.json();
    const { imageUrl } = body;

    const validation = validateImageUpload(imageUrl, "product", {
      required: true,
      requiredMessage: "Slika je obavezna",
    });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await processImageUpload(imageUrl, "product", crypto.randomUUID());
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, url: result.url });
  } catch (error) {
    console.error("Error uploading product image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
