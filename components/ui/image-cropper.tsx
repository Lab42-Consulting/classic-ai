"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Modal } from "./modal";
import { Button } from "./button";

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImageUrl: string) => void;
  title?: string;
  aspectRatio?: number;
  circularCrop?: boolean;
  locale?: "sr" | "en";
  outputWidth?: number;  // Output image width (default: 256)
  outputHeight?: number; // Output image height (default: 256)
  maxOutputSizeBytes?: number; // Max output size in bytes (default: 1MB for meals)
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  isOpen,
  onClose,
  onSave,
  title,
  aspectRatio = 1,
  circularCrop = true,
  locale = "sr",
  outputWidth = 256,
  outputHeight = 256,
  maxOutputSizeBytes = 1024 * 1024, // Default 1MB for meals
}: ImageCropperProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const t = {
    sr: {
      title: title || "Promeni avatar",
      selectImage: "Izaberi sliku",
      changeImage: "Promeni sliku",
      save: "Sačuvaj",
      cancel: "Otkaži",
      saving: "Čuvam...",
      compressing: "Kompresija slike...",
      dragHint: "Prevuci za pozicioniranje",
      maxSize: "JPEG/PNG/WebP/HEIC",
      errorTooLarge: "Slika je prevelika. Maksimum je 10MB.",
      errorInvalidType: "Nevažeći format. Koristi JPEG, PNG ili WebP.",
      errorCompressionFailed: "Nije moguće kompresovati sliku dovoljno.",
    },
    en: {
      title: title || "Change avatar",
      selectImage: "Select image",
      changeImage: "Change image",
      save: "Save",
      cancel: "Cancel",
      saving: "Saving...",
      compressing: "Compressing image...",
      dragHint: "Drag to position",
      maxSize: "JPEG/PNG/WebP/HEIC",
      errorTooLarge: "Image is too large. Maximum is 10MB.",
      errorInvalidType: "Invalid format. Use JPEG, PNG, or WebP.",
      errorCompressionFailed: "Unable to compress image enough.",
    },
  }[locale];

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    // Validate file type - be lenient since mobile browsers may have empty/wrong file.type
    // Trust the accept attribute filter, but reject obviously non-image files
    const fileType = file.type || "";
    const fileName = file.name.toLowerCase();
    const isImage = fileType.startsWith("image/") ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      fileName.endsWith(".webp") ||
      fileName.endsWith(".heic") ||
      fileName.endsWith(".heif");

    if (!isImage) {
      setError(t.errorInvalidType);
      return;
    }

    // Validate file size (10MB max for input - generous limit since we compress on save)
    // iPhones converting HEIC→JPEG can inflate file size significantly
    if (file.size > 10 * 1024 * 1024) {
      setError(t.errorTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [t.errorInvalidType, t.errorTooLarge]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  // Calculate base64 size in bytes (approximation: base64 adds ~37% overhead)
  const getBase64SizeBytes = (base64: string): number => {
    // Remove data URL prefix to get just the base64 content
    const base64Content = base64.split(",")[1] || base64;
    // Base64 encodes 3 bytes into 4 characters, so multiply by 3/4
    return Math.ceil((base64Content.length * 3) / 4);
  };

  const getCroppedImage = useCallback(async (): Promise<string | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Calculate pixel values from percentage crop
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (completedCrop.x / 100) * image.width * scaleX,
      y: (completedCrop.y / 100) * image.height * scaleY,
      width: (completedCrop.width / 100) * image.width * scaleX,
      height: (completedCrop.height / 100) * image.height * scaleY,
    };

    // Output size - customizable via props
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Draw cropped area to canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );

    // Adaptive compression: start at high quality and reduce until under size limit
    let quality = 0.92;
    const minQuality = 0.3;
    let result = canvas.toDataURL("image/jpeg", quality);
    let iterations = 0;
    const maxIterations = 10;

    while (getBase64SizeBytes(result) > maxOutputSizeBytes && quality > minQuality && iterations < maxIterations) {
      quality -= 0.08;
      result = canvas.toDataURL("image/jpeg", quality);
      iterations++;
    }

    // If still too large after max compression, return null to show error
    if (getBase64SizeBytes(result) > maxOutputSizeBytes) {
      return null;
    }

    return result;
  }, [completedCrop, outputWidth, outputHeight, maxOutputSizeBytes]);

  const handleSave = useCallback(async () => {
    setProcessing(true);
    setProcessingStatus(t.compressing);
    setError("");

    try {
      const croppedImageUrl = await getCroppedImage();
      if (croppedImageUrl) {
        setProcessingStatus(t.saving);
        onSave(croppedImageUrl);
        handleClose();
      } else {
        // Compression failed - image still too large
        setError(t.errorCompressionFailed);
      }
    } finally {
      setProcessing(false);
      setProcessingStatus("");
    }
  }, [getCroppedImage, onSave, t.compressing, t.saving, t.errorCompressionFailed]);

  const handleClose = useCallback(() => {
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    setError("");
    setProcessingStatus("");
    onClose();
  }, [onClose]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t.title}>
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!imgSrc ? (
          // File selection area
          <div
            onClick={triggerFileInput}
            className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
          >
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-foreground font-medium mb-1">{t.selectImage}</p>
            <p className="text-sm text-foreground-muted">{t.maxSize}</p>
          </div>
        ) : (
          // Crop area
          <div className="space-y-4">
            <div className={`relative ${circularCrop ? "circular-crop" : ""}`}>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                aspect={aspectRatio}
                circularCrop={circularCrop}
                className="max-h-[50vh] mx-auto"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={handleImageLoad}
                  className="max-h-[50vh] mx-auto"
                />
              </ReactCrop>
            </div>
            <p className="text-xs text-foreground-muted text-center">{t.dragHint}</p>
            <button
              onClick={triggerFileInput}
              className="w-full text-sm text-accent hover:underline"
            >
              {t.changeImage}
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-sm text-error text-center">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={processing}
          >
            {t.cancel}
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!completedCrop || processing}
          >
            {processing ? processingStatus || t.saving : t.save}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .circular-crop .ReactCrop__crop-selection {
          border-radius: 50%;
        }
      `}</style>
    </Modal>
  );
}
