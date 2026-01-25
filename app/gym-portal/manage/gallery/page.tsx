"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
}

export default function GalleryPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const response = await fetch("/api/admin/gallery");
        if (!response.ok) {
          router.push("/staff-login");
          return;
        }

        const data = await response.json();
        setImages(data.images || []);
      } catch {
        router.push("/staff-login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGallery();
  }, [router]);

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Molimo izaberite sliku" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Slika mora biti manja od 2MB" });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newImage: GalleryImage = {
        id: crypto.randomUUID(),
        imageUrl: base64,
        caption: "",
      };
      setImages([...images, newImage]);
      setEditingId(newImage.id);
      setMessage(null);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setImages(images.map((img) => (img.id === id ? { ...img, caption } : img)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setImages(newImages);
  };

  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setImages(newImages);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška pri čuvanju");
      }

      setMessage({ type: "success", text: "Galerija uspešno sačuvana!" });
      setEditingId(null);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Greška pri čuvanju",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Galerija teretane
        </h1>
        <p className="text-foreground-muted mt-2">
          Dodajte slike vaše teretane koje će se prikazati na javnom sajtu
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl ${
            message.type === "success"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-background-secondary border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-foreground mb-1">Saveti za slike</h3>
            <ul className="text-sm text-foreground-muted space-y-1">
              <li>• Maksimalno 6 slika u galeriji</li>
              <li>• Preporučena veličina: 800x600px ili veća</li>
              <li>• Maksimalna veličina fajla: 2MB po slici</li>
              <li>• Horizontalne slike izgledaju najbolje</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Existing Images */}
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative bg-background-secondary border border-border rounded-2xl overflow-hidden group"
          >
            {/* Image */}
            <div className="aspect-[4/3] relative">
              <img
                src={image.imageUrl}
                alt={image.caption || `Slika ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {/* Move up */}
                {index > 0 && (
                  <button
                    onClick={() => handleMoveUp(index)}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                    title="Pomeri gore"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}

                {/* Move down */}
                {index < images.length - 1 && (
                  <button
                    onClick={() => handleMoveDown(index)}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                    title="Pomeri dole"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="w-10 h-10 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white transition-colors"
                  title="Obriši"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Index badge */}
              <div className="absolute top-2 left-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">{index + 1}</span>
              </div>
            </div>

            {/* Caption Input */}
            <div className="p-3">
              <input
                type="text"
                placeholder="Naziv slike..."
                value={image.caption}
                onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm placeholder:text-foreground-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        ))}

        {/* Add New Image Button */}
        {images.length < 6 && (
          <button
            onClick={handleAddImage}
            className="aspect-[4/3] bg-background-secondary border-2 border-dashed border-border hover:border-accent/50 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-accent/10 flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-foreground-muted group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm text-foreground-muted group-hover:text-foreground">
              Dodaj sliku
            </span>
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-muted">
          {images.length}/6 slika
        </p>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Čuvanje...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Sačuvaj galeriju
            </>
          )}
        </button>
      </div>
    </div>
  );
}
