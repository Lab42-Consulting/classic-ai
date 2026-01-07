"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type GymTier = "starter" | "pro" | "elite";

interface FormData {
  gymName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  primaryColor: string;
  logo: string | null;
  tier: GymTier;
}

const DEFAULT_COLOR = "#ef4444";

const TIER_INFO = {
  starter: {
    name: "Starter",
    price: 99,
    features: [
      "Do 50 aktivnih članova",
      "10 AI poruka po članu dnevno",
      "Osnovno praćenje napretka",
      "QR prijava u teretanu",
    ],
    notIncluded: [
      "Izazovi",
      "Zakazivanje termina",
      "Trenerske funkcije",
    ],
  },
  pro: {
    name: "Pro",
    price: 199,
    popular: true,
    features: [
      "Do 150 aktivnih članova",
      "25 AI poruka po članu dnevno",
      "Izazovi i takmičenja",
      "Zakazivanje termina sa trenerima",
      "Trenerske funkcije",
      "QR prijava u teretanu",
    ],
    notIncluded: [
      "Prilagođeno brendiranje",
    ],
  },
  elite: {
    name: "Elite",
    price: 299,
    features: [
      "Neograničen broj članova",
      "50 AI poruka po članu dnevno",
      "Sve Pro funkcije",
      "Prilagođeno brendiranje",
      "Prioritetna podrška",
    ],
    notIncluded: [],
  },
} as const;

export default function GymRegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    gymName: "",
    ownerName: "",
    ownerEmail: "",
    phone: "",
    address: "",
    primaryColor: DEFAULT_COLOR,
    logo: null,
    tier: "pro", // Default to Pro (most popular)
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo ne sme biti veći od 2MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Logo mora biti slika (PNG, JPG, etc.)");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({ ...prev, logo: base64 }));
      setLogoPreview(base64);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.gymName || !formData.ownerName || !formData.ownerEmail || !formData.phone) {
        throw new Error("Molimo popunite sva obavezna polja");
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.ownerEmail)) {
        throw new Error("Molimo unesite validnu email adresu");
      }

      // Register gym
      const response = await fetch("/api/gym/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Greška pri registraciji");
      }

      // Store admin credentials in sessionStorage for retrieval after checkout
      if (data.admin) {
        sessionStorage.setItem(
          `gym_credentials_${data.gym.id}`,
          JSON.stringify({
            gymName: data.gym.name,
            staffId: data.admin.staffId,
            pin: data.admin.pin,
          })
        );
      }

      // Redirect to checkout with gym ID and selected tier
      router.push(`/gym-portal/checkout?gymId=${data.gym.id}&tier=${formData.tier}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepoznata greška");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Registrujte vašu teretanu
          </h1>
          <p className="mt-4 text-lg text-foreground-muted">
            Popunite podatke i aktivirajte pristup platformi
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error message */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-4">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Gym Info Section */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Podaci o teretani
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="gymName" className="block text-sm font-medium text-foreground mb-2">
                  Naziv teretane <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  id="gymName"
                  name="gymName"
                  value={formData.gymName}
                  onChange={handleChange}
                  placeholder="npr. Classic Gym"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  required
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
                  Adresa
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="npr. Bulevar Kralja Aleksandra 100, Beograd"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Owner Info Section */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Podaci o vlasniku
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-foreground mb-2">
                  Ime i prezime <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  id="ownerName"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  placeholder="npr. Marko Marković"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  required
                />
              </div>

              <div>
                <label htmlFor="ownerEmail" className="block text-sm font-medium text-foreground mb-2">
                  Email adresa <span className="text-accent">*</span>
                </label>
                <input
                  type="email"
                  id="ownerEmail"
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  placeholder="npr. marko@teretana.rs"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  required
                />
                <p className="mt-2 text-xs text-foreground-muted">
                  Na ovu adresu ćete primati račune i obaveštenja
                </p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                  Telefon <span className="text-accent">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="npr. +381 64 123 4567"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Branding Section */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Brendiranje (opciono)
            </h2>

            <div className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Logo teretane
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-accent/50 cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl text-foreground-muted">📷</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                    >
                      {logoPreview ? "Promeni logo" : "Dodaj logo"}
                    </button>
                    <p className="text-xs text-foreground-muted mt-1">
                      PNG ili JPG, max 2MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-foreground mb-2">
                  Primarna boja
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-xl border border-border cursor-pointer"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      placeholder="#ef4444"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent font-mono text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-foreground-muted mt-2">
                  Ova boja će se koristiti za dugmad i akcentne elemente u aplikaciji
                </p>
              </div>

              {/* Preview */}
              <div className="bg-background rounded-xl p-4 border border-border">
                <p className="text-xs text-foreground-muted mb-3">Pregled:</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    {formData.gymName ? formData.gymName[0].toUpperCase() : "C"}
                  </div>
                  <span className="font-medium text-foreground">
                    {formData.gymName || "Vaša Teretana"}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    Primer dugmeta
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: `${formData.primaryColor}20`,
                      color: formData.primaryColor,
                    }}
                  >
                    Sekundarno dugme
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tier Selection */}
          <div className="bg-background-secondary border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Izaberite paket
            </h2>
            <p className="text-sm text-foreground-muted mb-6">
              Odaberite paket koji najbolje odgovara potrebama vaše teretane
            </p>

            <div className="grid gap-4">
              {(["starter", "pro", "elite"] as const).map((tier) => {
                const info = TIER_INFO[tier];
                const isSelected = formData.tier === tier;
                const isPopular = "popular" in info && info.popular;

                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, tier }))}
                    className={`relative text-left p-5 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/30 bg-background"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-4 px-3 py-1 bg-accent text-white text-xs font-medium rounded-full">
                        Najpopularnije
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-accent bg-accent"
                                : "border-foreground-muted"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="font-semibold text-foreground">
                            {info.name}
                          </span>
                        </div>

                        <ul className="ml-8 space-y-1">
                          {info.features.slice(0, 3).map((feature, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-foreground-muted flex items-center gap-2"
                            >
                              <svg
                                className="w-4 h-4 text-emerald-400 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              {feature}
                            </li>
                          ))}
                          {info.notIncluded.length > 0 && (
                            <li className="text-sm text-foreground-muted/50 flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-foreground-muted/30 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              {info.notIncluded[0]}
                              {info.notIncluded.length > 1 &&
                                ` +${info.notIncluded.length - 1}`}
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">
                          €{info.price}
                        </p>
                        <p className="text-xs text-foreground-muted">/mesec</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Tier Summary */}
          <div className="bg-accent/5 border border-accent/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted">Mesečna pretplata</p>
                <p className="text-2xl font-bold text-foreground">
                  €{TIER_INFO[formData.tier].price}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-foreground-muted">Izabrani paket</p>
                <p className="text-sm font-medium text-accent">
                  {TIER_INFO[formData.tier].name}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold text-lg rounded-xl transition-colors"
          >
            {isSubmitting ? "Registracija u toku..." : "Nastavi na plaćanje"}
          </button>

          <p className="text-center text-sm text-foreground-muted">
            Klikom na dugme prihvatate naše uslove korišćenja i politiku privatnosti
          </p>
        </form>
      </div>
    </div>
  );
}
