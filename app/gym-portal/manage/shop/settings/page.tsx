"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StoreSettings {
  storeEnabled: boolean;
  storePickupAddress: string | null;
  storeDeliveryFeeRsd: number | null;
  storeFreeDeliveryThresholdRsd: number | null;
  storeContactPhone: string | null;
  storeNote: string | null;
}

export default function StoreSettingsPage() {
  const [form, setForm] = useState<StoreSettings>({
    storeEnabled: false,
    storePickupAddress: "",
    storeDeliveryFeeRsd: null,
    storeFreeDeliveryThresholdRsd: null,
    storeContactPhone: "",
    storeNote: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/store-settings");
        if (res.ok) {
          const data = await res.json();
          if (data.store) {
            setForm({
              storeEnabled: data.store.storeEnabled ?? false,
              storePickupAddress: data.store.storePickupAddress ?? "",
              storeDeliveryFeeRsd: data.store.storeDeliveryFeeRsd ?? null,
              storeFreeDeliveryThresholdRsd: data.store.storeFreeDeliveryThresholdRsd ?? null,
              storeContactPhone: data.store.storeContactPhone ?? "",
              storeNote: data.store.storeNote ?? "",
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/store-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Greška");
      }
      setMessage({ type: "success", text: "Podešavanja sačuvana" });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Greška" });
    } finally {
      setSaving(false);
    }
  }

  const numField = (v: number | null) => (v === null ? "" : String(v));

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/gym-portal/manage/shop" className="text-sm text-foreground-muted hover:text-foreground">
        ← Nazad na Magacin
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">Podešavanja prodavnice</h1>
      <p className="text-foreground-muted mt-1 mb-6">Uključite javnu prodavnicu i podesite dostavu</p>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-white font-medium ${message.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-center justify-between p-4 rounded-2xl border border-border bg-background-secondary cursor-pointer">
          <div>
            <p className="font-medium text-foreground">Prodavnica aktivna</p>
            <p className="text-xs text-foreground-muted">Prikaži javnu prodavnicu na sajtu teretane</p>
          </div>
          <input
            type="checkbox"
            checked={form.storeEnabled}
            onChange={(e) => setForm({ ...form, storeEnabled: e.target.checked })}
            className="w-6 h-6 accent-accent"
          />
        </label>

        <Field label="Adresa za preuzimanje">
          <input
            value={form.storePickupAddress ?? ""}
            onChange={(e) => setForm({ ...form, storePickupAddress: e.target.value })}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
            placeholder="npr. Bulevar oslobođenja 1, Novi Sad"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Cena dostave (RSD)">
            <input
              type="number"
              min="0"
              value={numField(form.storeDeliveryFeeRsd)}
              onChange={(e) => setForm({ ...form, storeDeliveryFeeRsd: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              placeholder="npr. 300"
            />
          </Field>
          <Field label="Besplatna dostava preko (RSD)">
            <input
              type="number"
              min="0"
              value={numField(form.storeFreeDeliveryThresholdRsd)}
              onChange={(e) =>
                setForm({ ...form, storeFreeDeliveryThresholdRsd: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              placeholder="npr. 5000"
            />
          </Field>
        </div>

        <Field label="Kontakt telefon prodavnice">
          <input
            value={form.storeContactPhone ?? ""}
            onChange={(e) => setForm({ ...form, storeContactPhone: e.target.value })}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
            placeholder="npr. 021 123 456"
          />
        </Field>

        <Field label="Napomena za naplatu (prikazuje se na plaćanju)">
          <textarea
            value={form.storeNote ?? ""}
            onChange={(e) => setForm({ ...form, storeNote: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent resize-none"
            placeholder="npr. Plaćanje pouzećem ili lično u teretani"
          />
        </Field>

        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-medium rounded-xl"
        >
          {saving ? "Čuvanje..." : "Sačuvaj"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
