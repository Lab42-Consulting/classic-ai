/**
 * Storage utilities for Vercel Blob
 * Handles image uploads and management for avatars, meal photos, and gym branding
 */

import { put, del } from "@vercel/blob";

// File size limits
const MAX_AVATAR_SIZE = 500 * 1024; // 500KB
const MAX_MEAL_PHOTO_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_BRANDING_SIZE = 1 * 1024 * 1024; // 1MB

// Valid image types
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VALID_DATA_URL_PREFIXES = [
  "data:image/jpeg",
  "data:image/png",
  "data:image/webp",
];

type ImageCategory = "avatar" | "meal" | "branding";

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Get max size for an image category
 */
function getMaxSize(category: ImageCategory): number {
  switch (category) {
    case "avatar":
      return MAX_AVATAR_SIZE;
    case "meal":
      return MAX_MEAL_PHOTO_SIZE;
    case "branding":
      return MAX_BRANDING_SIZE;
  }
}

/**
 * Check if a string is a base64 data URL
 */
export function isBase64DataUrl(str: string): boolean {
  return str.startsWith("data:image/");
}

/**
 * Check if a string is a Vercel Blob URL
 */
export function isBlobUrl(str: string): boolean {
  return (
    str.startsWith("https://") &&
    (str.includes(".blob.vercel-storage.com") ||
      str.includes(".public.blob.vercel-storage.com"))
  );
}

/**
 * Convert base64 data URL to Buffer and extract content type
 */
function parseBase64DataUrl(
  dataUrl: string
): { buffer: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const contentType = match[1];
  const base64Data = match[2];

  try {
    const buffer = Buffer.from(base64Data, "base64");
    return { buffer, contentType };
  } catch {
    return null;
  }
}

/**
 * Generate a unique filename for blob storage
 */
function generateFilename(
  category: ImageCategory,
  entityId: string,
  contentType: string
): string {
  const extension = contentType.split("/")[1] || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${category}/${entityId}/${timestamp}-${random}.${extension}`;
}

/**
 * Get display name for image category (for error messages)
 */
function getCategoryDisplayName(category: ImageCategory): string {
  switch (category) {
    case "meal":
      return "Photo";
    case "avatar":
      return "Avatar";
    case "branding":
      return "Logo";
  }
}

/**
 * Format size for error message
 */
function formatSizeForError(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }
  return `${Math.round(bytes / 1024)}KB`;
}

/**
 * Validate image data
 */
function validateImage(
  dataUrl: string,
  category: ImageCategory
): { valid: boolean; error?: string } {
  const displayName = getCategoryDisplayName(category);

  // Check data URL format
  if (!isBase64DataUrl(dataUrl)) {
    return { valid: false, error: `${displayName} must be an image` };
  }

  // Check image type
  if (!VALID_DATA_URL_PREFIXES.some((prefix) => dataUrl.startsWith(prefix))) {
    return { valid: false, error: `${displayName} must be JPEG, PNG, or WebP` };
  }

  // Check size (base64 is ~1.37x larger than binary)
  const maxSize = getMaxSize(category);
  const maxBase64Size = maxSize * 1.4;
  if (dataUrl.length > maxBase64Size) {
    return { valid: false, error: `${displayName} too large. Max ${formatSizeForError(maxSize)}.` };
  }

  return { valid: true };
}

/**
 * Upload an image to Vercel Blob storage
 *
 * @param dataUrl - Base64 encoded data URL (e.g., "data:image/jpeg;base64,...")
 * @param category - Image category for organization and size limits
 * @param entityId - Entity ID (member ID, meal ID, gym ID) for filename
 * @returns Upload result with URL on success
 */
export async function uploadImage(
  dataUrl: string,
  category: ImageCategory,
  entityId: string
): Promise<UploadResult> {
  // Validate the image
  const validation = validateImage(dataUrl, category);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Parse the data URL
  const parsed = parseBase64DataUrl(dataUrl);
  if (!parsed) {
    return { success: false, error: "Invalid image data" };
  }

  const { buffer, contentType } = parsed;

  // Validate content type
  if (!VALID_IMAGE_TYPES.includes(contentType)) {
    return { success: false, error: "Invalid image type" };
  }

  try {
    const filename = generateFilename(category, entityId, contentType);

    const blob = await put(filename, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false, // We generate our own unique names
    });

    return { success: true, url: blob.url };
  } catch (error) {
    console.error("Blob upload error:", error);
    return { success: false, error: "Failed to upload image" };
  }
}

/**
 * Delete an image from Vercel Blob storage
 *
 * @param url - The Blob URL to delete
 * @returns true if deleted successfully (or URL was not a blob)
 */
export async function deleteImage(url: string | null): Promise<boolean> {
  if (!url) return true;

  // Only delete if it's a Vercel Blob URL
  if (!isBlobUrl(url)) {
    return true; // Not a blob URL, nothing to delete
  }

  try {
    await del(url);
    return true;
  } catch (error) {
    console.error("Blob delete error:", error);
    return false;
  }
}

/**
 * Process an image field that may be base64 or already a URL
 *
 * During migration, this handles both:
 * - New uploads (base64 data URLs) -> uploads to blob, returns blob URL
 * - Existing URLs (already in blob) -> returns as-is
 * - null/undefined -> returns null
 *
 * @param imageData - Base64 data URL, blob URL, or null
 * @param category - Image category
 * @param entityId - Entity ID for filename
 * @param oldUrl - Previous URL to delete if replacing
 * @returns URL to store in database (blob URL or null)
 */
export async function processImageUpload(
  imageData: string | null | undefined,
  category: ImageCategory,
  entityId: string,
  oldUrl?: string | null
): Promise<{ url: string | null; error?: string }> {
  // Handle removal
  if (imageData === null || imageData === undefined || imageData === "") {
    // Delete old image if it was a blob
    if (oldUrl) {
      await deleteImage(oldUrl);
    }
    return { url: null };
  }

  // If it's already a blob URL, keep it
  if (isBlobUrl(imageData)) {
    return { url: imageData };
  }

  // If it's a base64 data URL, upload it
  if (isBase64DataUrl(imageData)) {
    const result = await uploadImage(imageData, category, entityId);
    if (!result.success) {
      return { url: null, error: result.error };
    }

    // Delete old image if replacing
    if (oldUrl && oldUrl !== result.url) {
      await deleteImage(oldUrl);
    }

    return { url: result.url ?? null };
  }

  // Unknown format
  return { url: null, error: "Invalid image format" };
}

/**
 * Check if image data needs upload (is base64)
 * Useful for validation before processing
 */
export function needsUpload(imageData: string | null | undefined): boolean {
  if (!imageData) return false;
  return isBase64DataUrl(imageData);
}

/**
 * Validate image without uploading
 * Use this for early validation before database operations
 */
export function validateImageUpload(
  imageData: string | null | undefined,
  category: ImageCategory,
  options?: { required?: boolean; requiredMessage?: string }
): { valid: boolean; error?: string } {
  const displayName = getCategoryDisplayName(category);

  // Check if required
  if (options?.required && !imageData) {
    return {
      valid: false,
      error: options.requiredMessage || `${displayName} is required`,
    };
  }

  // Null/undefined is valid if not required
  if (!imageData) {
    return { valid: true };
  }

  // If already a blob URL, it's valid
  if (isBlobUrl(imageData)) {
    return { valid: true };
  }

  // Validate base64 data URL
  if (isBase64DataUrl(imageData)) {
    return validateImage(imageData, category);
  }

  return { valid: false, error: `${displayName} must be an image` };
}
