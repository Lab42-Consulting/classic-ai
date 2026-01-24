"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface GymSettings {
  id: string;
  name: string;
  logo: string | null;
  about: string | null;
  address: string | null;
  phone: string | null;
  openingHours: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

const colorPresets = [
  { name: "Crvena", primary: "#ef4444", secondary: "#22c55e" },
  { name: "Narandžasta", primary: "#f97316", secondary: "#3b82f6" },
  { name: "Žuta", primary: "#eab308", secondary: "#8b5cf6" },
  { name: "Zelena", primary: "#22c55e", secondary: "#f97316" },
  { name: "Teal", primary: "#14b8a6", secondary: "#ec4899" },
  { name: "Plava", primary: "#3b82f6", secondary: "#f97316" },
  { name: "Indigo", primary: "#6366f1", secondary: "#22c55e" },
  { name: "Ljubičasta", primary: "#8b5cf6", secondary: "#eab308" },
  { name: "Roze", primary: "#ec4899", secondary: "#14b8a6" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    logo: "",
    about: "",
    address: "",
    phone: "",
    openingHours: "",
    primaryColor: "#ef4444",
    secondaryColor: "#22c55e",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/gym-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.gym);
        setForm({
          name: data.gym.name || "",
          logo: data.gym.logo || "",
          about: data.gym.about || "",
          address: data.gym.address || "",
          phone: data.gym.phone || "",
          openingHours: data.gym.openingHours || "",
          primaryColor: data.gym.primaryColor || "#ef4444",
          secondaryColor: data.gym.secondaryColor || "#22c55e",
        });
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError("Nije moguće učitati podešavanja");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/gym-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setSettings(data.gym);
        setSuccess("Podešavanja su sačuvana!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Čuvanje nije uspelo");
      }
    } catch {
      setError("Greška pri čuvanju");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setError("Logo mora biti manji od 500KB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm((f) => ({ ...f, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const applyPreset = (preset: (typeof colorPresets)[0]) => {
    setForm((f) => ({
      ...f,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Podešavanja sajta</h1>
            <p className="text-foreground-muted text-sm mt-1">
              Prilagodite javni sajt teretane
            </p>
          </div>
          <Link
            href="/gym-portal"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-lg border border-border transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Pregled sajta
          </Link>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info Section */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Osnovne informacije</h2>

            <div className="space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Logo teretane
                </label>
                <div className="flex items-center gap-4">
                  {form.logo ? (
                    <img
                      src={form.logo}
                      alt="Logo"
                      className="w-20 h-20 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center border border-border"
                      style={{ backgroundColor: `${form.primaryColor}20` }}
                    >
                      <span className="text-2xl font-bold" style={{ color: form.primaryColor }}>
                        {form.name.charAt(0).toUpperCase() || "T"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-lg border border-border transition-colors text-sm"
                    >
                      Otpremi logo
                    </button>
                    {form.logo && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, logo: "" }))}
                        className="px-4 py-2 text-foreground-muted hover:text-error transition-colors text-sm"
                      >
                        Ukloni
                      </button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-foreground-muted mt-2">
                  Preporučena veličina: 200x200px, max 500KB
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Naziv teretane *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  required
                />
              </div>

              {/* About */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  O teretani
                </label>
                <textarea
                  value={form.about}
                  onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))}
                  rows={4}
                  placeholder="Kratki opis teretane koji će se prikazivati na sajtu..."
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Info Section */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Kontakt informacije</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Adresa
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="npr. Bulevar Oslobođenja 123, Novi Sad"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="npr. +381 60 123 4567"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Opening Hours */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Radno vreme
                </label>
                <textarea
                  value={form.openingHours}
                  onChange={(e) => setForm((f) => ({ ...f, openingHours: e.target.value }))}
                  rows={3}
                  placeholder="Pon-Pet: 06:00 - 22:00&#10;Sub: 08:00 - 20:00&#10;Ned: 09:00 - 18:00"
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
                <p className="text-xs text-foreground-muted mt-1">
                  Svaki red će biti prikazan kao nova linija
                </p>
              </div>
            </div>
          </div>

          {/* Color Palette Section */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Paleta boja</h2>

            {/* Presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Gotove palete
              </label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      form.primaryColor === preset.primary
                        ? "border-white/30 bg-white/10"
                        : "border-border hover:border-white/20"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span className="text-sm text-foreground">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Primarna boja
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={form.primaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sekundarna boja
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={form.secondaryColor}
                    onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <div className="mt-6 p-4 bg-background rounded-xl border border-border">
              <p className="text-sm font-medium text-foreground-muted mb-3">Pregled</p>
              <div className="flex items-center gap-4">
                <div
                  className="flex-1 h-12 rounded-lg flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  Primarno dugme
                </div>
                <div
                  className="flex-1 h-12 rounded-lg flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: form.secondaryColor }}
                >
                  Sekundarno
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div
                  className="flex-1 h-12 rounded-lg flex items-center justify-center font-semibold border-2"
                  style={{
                    borderColor: form.primaryColor,
                    color: form.primaryColor,
                    backgroundColor: `${form.primaryColor}10`,
                  }}
                >
                  Outline stil
                </div>
                <div className="flex-1 flex items-center gap-2 justify-center">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: form.primaryColor }}
                  />
                  <span style={{ color: form.primaryColor }} className="font-medium">
                    Tekst u boji
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Link
              href="/gym-portal/manage"
              className="text-foreground-muted hover:text-foreground transition-colors"
            >
              Nazad na upravljanje
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {isSaving ? "Čuvanje..." : "Sačuvaj podešavanja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
