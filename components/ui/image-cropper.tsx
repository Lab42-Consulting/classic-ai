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
}: ImageCropperProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const t = {
    sr: {
      title: title || "Promeni avatar",
      selectImage: "Izaberi sliku",
      changeImage: "Promeni sliku",
      save: "Sačuvaj",
      cancel: "Otkaži",
      saving: "Čuvam...",
      dragHint: "Prevuci za pozicioniranje",
      maxSize: "Max 5MB, JPEG/PNG/WebP",
    },
    en: {
      title: title || "Change avatar",
      selectImage: "Select image",
      changeImage: "Change image",
      save: "Save",
      cancel: "Cancel",
      saving: "Saving...",
      dragHint: "Drag to position",
      maxSize: "Max 5MB, JPEG/PNG/WebP",
    },
  }[locale];

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (5MB max for input, will be compressed on save)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

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

    // Convert to base64 with compression (0.80 for larger images to keep under size limits)
    const quality = outputWidth > 256 ? 0.80 : 0.85;
    return canvas.toDataURL("image/jpeg", quality);
  }, [completedCrop, outputWidth, outputHeight]);

  const handleSave = useCallback(async () => {
    setProcessing(true);
    try {
      const croppedImageUrl = await getCroppedImage();
      if (croppedImageUrl) {
        onSave(croppedImageUrl);
        handleClose();
      }
    } finally {
      setProcessing(false);
    }
  }, [getCroppedImage, onSave]);

  const handleClose = useCallback(() => {
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
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
          accept="image/jpeg,image/png,image/webp"
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
            {processing ? t.saving : t.save}
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
