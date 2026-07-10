"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { getCart, clearCart, type CartItem } from "@/lib/cart";
import { formatRsd } from "@/lib/storefront-format";

interface StoreInfo {
  name: string;
  logo: string | null;
  storeDeliveryFeeRsd: number | null;
  storeFreeDeliveryThresholdRsd: number | null;
  storeNote: string | null;
  storePickupAddress: string | null;
}

interface Placed {
  orderNumber: string;
  totalRsd: number;
  subtotalRsd: number;
  deliveryFeeRsd: number | null;
  fulfillmentType: string;
}

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<CartItem[]>([]);
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    fulfillmentType: "pickup" as "pickup" | "delivery",
    deliveryAddress: "",
    note: "",
  });

  useEffect(() => {
    setItems(getCart(slug));
  }, [slug]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/public/shop/${slug}`);
        if (res.ok) setStore((await res.json()).gym);
      } catch {
        /* ignore */
      }
    })();
  }, [slug]);

  const subtotal = items.reduce((s, i) => s + i.priceRsd * i.quantity, 0);
  const threshold = store?.storeFreeDeliveryThresholdRsd ?? null;
  const deliveryFee =
    form.fulfillmentType === "delivery"
      ? threshold !== null && subtotal >= threshold
        ? 0
        : store?.storeDeliveryFeeRsd ?? 0
      : 0;
  const total = subtotal + deliveryFee;

  async function submit() {
    setError(null);
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setError("Ime i telefon su obavezni.");
      return;
    }
    if (form.fulfillmentType === "delivery" && !form.deliveryAddress.trim()) {
      setError("Adresa za dostavu je obavezna.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/shop/${slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.details?.length ? `${data.error}: ${data.details.join(", ")}` : data.error || "Greška"
        );
        return;
      }
      clearCart(slug);
      setPlaced(data.order);
    } catch {
      setError("Greška pri slanju porudžbine.");
    } finally {
      setSubmitting(false);
    }
  }

  // Order confirmation
  if (placed) {
    return (
      <div className="min-h-screen bg-background">
        <StorefrontHeader slug={slug} gymName={store?.name || "Prodavnica"} gymLogo={store?.logo || null} />
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Porudžbina primljena!</h1>
          <p className="text-foreground-muted mt-2">
            Broj porudžbine: <span className="font-semibold text-foreground">#{placed.orderNumber}</span>
          </p>
          <div className="mt-6 p-4 rounded-2xl border border-white/10 bg-background-secondary text-left">
            <Row label="Međuzbir" value={formatRsd(placed.subtotalRsd)} />
            {placed.fulfillmentType === "delivery" && (
              <Row label="Dostava" value={formatRsd(placed.deliveryFeeRsd ?? 0)} />
            )}
            <div className="flex justify-between pt-2 mt-2 border-t border-white/10">
              <span className="font-medium text-foreground">Ukupno</span>
              <span className="font-bold text-foreground">{formatRsd(placed.totalRsd)}</span>
            </div>
          </div>
          <p className="text-sm text-foreground-muted mt-4">
            Plaćanje pouzećem ili lično u teretani. Kontaktiraćemo vas radi potvrde.
          </p>
          <Link
            href={`/gym-portal/${slug}/shop`}
            className="inline-block mt-6 px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-medium"
          >
            Nazad u prodavnicu
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader slug={slug} gymName={store?.name || "Prodavnica"} gymLogo={store?.logo || null} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Plaćanje</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-foreground-muted mb-4">Korpa je prazna.</p>
            <Link href={`/gym-portal/${slug}/shop/browse`} className="text-accent">
              Pogledaj proizvode
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-4">
              <Field label="Ime i prezime *">
                <input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Telefon *">
                <input
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Email (opciono)">
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  className="input"
                />
              </Field>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Način preuzimanja</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["pickup", "delivery"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, fulfillmentType: t })}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium ${
                        form.fulfillmentType === t
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-white/10 bg-background-secondary text-foreground-muted"
                      }`}
                    >
                      {t === "pickup" ? "Lično preuzimanje" : "Dostava"}
                    </button>
                  ))}
                </div>
              </div>

              {form.fulfillmentType === "delivery" && (
                <Field label="Adresa za dostavu *">
                  <input
                    value={form.deliveryAddress}
                    onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                    className="input"
                    placeholder="Ulica i broj, grad"
                  />
                </Field>
              )}

              {form.fulfillmentType === "pickup" && store?.storePickupAddress && (
                <p className="text-sm text-foreground-muted">Preuzimanje: {store.storePickupAddress}</p>
              )}

              <Field label="Napomena (opciono)">
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  className="input resize-none"
                />
              </Field>
            </div>

            {/* Summary */}
            <div className="h-fit p-4 rounded-2xl border border-white/10 bg-background-secondary">
              <h2 className="font-semibold text-foreground mb-3">Vaša porudžbina</h2>
              <div className="space-y-2 mb-3">
                {items.map((i) => (
                  <div key={i.productId} className="flex justify-between text-sm">
                    <span className="text-foreground-muted">
                      {i.name} × {i.quantity}
                    </span>
                    <span className="text-foreground">{formatRsd(i.priceRsd * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-3 space-y-1">
                <Row label="Međuzbir" value={formatRsd(subtotal)} />
                {form.fulfillmentType === "delivery" && <Row label="Dostava" value={formatRsd(deliveryFee)} />}
                <div className="flex justify-between pt-2">
                  <span className="font-medium text-foreground">Ukupno</span>
                  <span className="font-bold text-foreground text-lg">{formatRsd(total)}</span>
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full mt-4 px-6 py-3 rounded-xl bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold"
              >
                {submitting ? "Slanje..." : "Poruči"}
              </button>
              <p className="text-xs text-foreground-muted text-center mt-2">
                {store?.storeNote || "Plaćanje pouzećem ili lično — bez online kartice."}
              </p>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: var(--background);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          color: var(--foreground);
          outline: none;
        }
      `}</style>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-foreground-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
