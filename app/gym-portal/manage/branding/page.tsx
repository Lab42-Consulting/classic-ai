"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface GymBranding {
  id: string;
  name: string;
  logo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  slug?: string | null;
}

const presetColors = [
  { name: "Crvena", value: "#ef4444" },
  { name: "Narandžasta", value: "#f97316" },
  { name: "Žuta", value: "#eab308" },
  { name: "Zelena", value: "#22c55e" },
  { name: "Tirkizna", value: "#14b8a6" },
  { name: "Plava", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Ljubičasta", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Siva", value: "#6b7280" },
];

export default function BrandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [gym, setGym] = useState<GymBranding | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#ef4444");
  const [secondaryColor, setSecondaryColor] = useState("#1e1e1e");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch("/api/gym/branding");
        if (!response.ok) {
          router.push("/staff-login");
          return;
        }

        const data = await response.json();
        setGym(data);
        setLogo(data.logo || null);
        setPrimaryColor(data.primaryColor || "#ef4444");
        setSecondaryColor(data.secondaryColor || "#1e1e1e");
        setSlug(data.slug || "");
      } catch {
        router.push("/staff-login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranding();
  }, [router]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setLogo(base64);
      setMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validate slug format
  const validateSlug = (value: string): string | null => {
    if (!value) return null; // Empty is valid (optional)

    const reservedWords = ["manage", "login", "api", "admin", "staff", "member", "gym-signup"];
    if (reservedWords.includes(value.toLowerCase())) {
      return "Ovaj slug je rezervisan";
    }

    if (value.length < 3) {
      return "Slug mora imati najmanje 3 karaktera";
    }

    if (value.length > 50) {
      return "Slug može imati najviše 50 karaktera";
    }

    if (!/^[a-z0-9-]+$/.test(value)) {
      return "Samo mala slova, brojevi i crtice";
    }

    if (value.startsWith("-") || value.endsWith("-")) {
      return "Slug ne može početi ili završiti crticom";
    }

    return null;
  };

  const handleSlugChange = (value: string) => {
    // Auto-format: lowercase and replace spaces with hyphens
    const formatted = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setSlug(formatted);
    setSlugError(validateSlug(formatted));
  };

  const handleSave = async () => {
    if (!gym) return;

    // Validate slug before saving
    const slugValidationError = validateSlug(slug);
    if (slugValidationError) {
      setSlugError(slugValidationError);
      setMessage({ type: "error", text: slugValidationError });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/gym/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo,
          primaryColor,
          secondaryColor,
          slug: slug || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Greška pri čuvanju");
      }

      setMessage({ type: "success", text: "Brendiranje uspešno sačuvano!" });

      // Refresh the page data
      const updated = await response.json();
      setGym(updated);
      setSlug(updated.slug || "");
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

  if (!gym) {
    return (
      <div className="py-20 text-center text-foreground-muted">
        Greška pri učitavanju podataka
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Brendiranje teretane
        </h1>
        <p className="text-foreground-muted mt-2">
          Prilagodite izgled aplikacije vašem brendu
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl ${
          message.type === "success"
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-red-500/20 text-red-400 border border-red-500/30"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Settings */}
        <div className="space-y-8">
          {/* Logo Upload */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Logo teretane</h2>
            <p className="text-sm text-foreground-muted mb-6">
              Preporučena veličina: 200x200px. Maksimalna veličina fajla: 2MB.
            </p>

            {/* Centered Logo Preview */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                {logo ? (
                  <img
                    src={logo}
                    alt={gym.name}
                    className="w-32 h-32 rounded-2xl object-cover border-2 border-border shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-white/5 border-2 border-dashed border-border flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-10 h-10 text-foreground-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-foreground-muted">Bez loga</span>
                    </div>
                  </div>
                )}

                {logo && (
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                    title="Ukloni logo"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <p className="text-sm text-foreground-muted mt-3">{gym.name}</p>
            </div>

            {/* Upload Button */}
            <div className="flex justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-foreground rounded-xl transition-colors cursor-pointer border border-white/10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {logo ? "Promeni logo" : "Otpremi logo"}
              </label>
            </div>
          </div>

          {/* Primary Color */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Primarna boja</h2>
            <p className="text-sm text-foreground-muted mb-6">
              Ova boja će se koristiti za dugmad, linkove i istaknute elemente.
            </p>

            {/* Color Presets */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className={`aspect-square rounded-xl border-2 transition-all ${
                    primaryColor === color.value
                      ? "border-white scale-110 shadow-lg"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm text-foreground-muted mb-2 block">
                  Prilagođena boja
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={primaryColor.toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                        setPrimaryColor(value);
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground font-mono focus:outline-none focus:border-accent"
                    placeholder="#EF4444"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Color */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Sekundarna boja</h2>
            <p className="text-sm text-foreground-muted mb-6">
              Koristi se za pozadine i sekundarne elemente.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-0"
              />
              <input
                type="text"
                value={secondaryColor.toUpperCase()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                    setSecondaryColor(value);
                  }
                }}
                className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground font-mono focus:outline-none focus:border-accent"
                placeholder="#1E1E1E"
              />
            </div>
          </div>

          {/* URL Slug */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">URL slug</h2>
                <p className="text-sm text-foreground-muted mt-1">
                  Jedinstveni URL za vašu marketing stranicu
                </p>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">Čemu služi slug?</p>
                  <p className="text-blue-300/80">
                    Slug vam omogućava da imate jedinstvenu marketing stranicu na adresi poput{" "}
                    <span className="font-mono text-blue-400">classicgym.com/gym-portal/vasa-lokacija</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-foreground-muted mb-2 block">
                  Slug (opciono)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">
                    /gym-portal/
                  </div>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    className={`w-full pl-28 pr-4 py-3 bg-background border rounded-xl text-foreground focus:outline-none transition-colors ${
                      slugError
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-border focus:border-accent"
                    }`}
                    placeholder="vasa-lokacija"
                  />
                </div>
                {slugError && (
                  <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {slugError}
                  </p>
                )}
              </div>

              {/* URL Preview */}
              {slug && !slugError && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-sm text-emerald-300 mb-2">Vaša marketing stranica:</p>
                  <p className="font-mono text-sm text-emerald-400 break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/gym-portal/{slug}
                  </p>
                </div>
              )}

              <p className="text-xs text-foreground-muted">
                Slug može sadržati samo mala slova, brojeve i crtice. Npr: &quot;classic-bulevar&quot;, &quot;gym-centar&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Pregled</h2>
            <p className="text-sm text-foreground-muted mb-6">
              Ovako će izgledati aplikacija za vaše članove
            </p>

            {/* Phone Preview */}
            <div className="relative mx-auto" style={{ maxWidth: 280 }}>
              {/* Phone Frame */}
              <div className="bg-background border-4 border-gray-800 rounded-[2.5rem] p-2 shadow-2xl">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-2xl" />

                {/* Screen */}
                <div className="bg-background rounded-[2rem] overflow-hidden">
                  {/* Status Bar */}
                  <div className="h-8 flex items-center justify-between px-6 pt-2">
                    <span className="text-[10px] text-foreground-muted">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 bg-foreground-muted rounded-sm" />
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                    {logo ? (
                      <img src={logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <span className="text-white text-sm font-bold">
                          {gym.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm font-semibold text-foreground truncate">
                      {gym.name}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    {/* Welcome Card */}
                    <div
                      className="rounded-xl p-4"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <p className="text-xs" style={{ color: primaryColor }}>Danas</p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        Dobrodošli nazad!
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[10px] text-foreground-muted">Kalorije</p>
                        <p className="text-lg font-bold text-foreground">1,850</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[10px] text-foreground-muted">Protein</p>
                        <p className="text-lg font-bold text-foreground">142g</p>
                      </div>
                    </div>

                    {/* Button */}
                    <button
                      className="w-full py-3 rounded-xl text-white text-sm font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Dodaj obrok
                    </button>
                  </div>

                  {/* Bottom Nav */}
                  <div className="flex items-center justify-around py-3 border-t border-border">
                    {["Početna", "Obroci", "AI", "Profil"].map((item, i) => (
                      <div key={item} className="text-center">
                        <div
                          className={`w-6 h-6 mx-auto rounded-lg ${
                            i === 0 ? "" : "bg-white/10"
                          }`}
                          style={i === 0 ? { backgroundColor: `${primaryColor}30` } : {}}
                        />
                        <span
                          className="text-[9px] mt-1 block"
                          style={i === 0 ? { color: primaryColor } : { color: "gray" }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="mt-6 w-full py-4 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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
                Sačuvaj izmene
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
