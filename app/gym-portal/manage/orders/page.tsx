"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  productNameCached: string;
  quantity: number;
  unitPriceRsd: number;
  lineTotalRsd: number;
}
interface Order {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentType: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string | null;
  note: string | null;
  subtotalRsd: number;
  deliveryFeeRsd: number | null;
  totalRsd: number;
  createdAt: string;
  cancelledReason: string | null;
  items?: OrderItem[];
  _count?: { items: number };
}

const STATUS_LABEL: Record<string, string> = {
  new: "Nova",
  confirmed: "Potvrđena",
  ready: "Spremna",
  fulfilled: "Isporučena",
  cancelled: "Otkazana",
};
const STATUS_CLASS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  confirmed: "bg-violet-500/20 text-violet-400",
  ready: "bg-amber-500/20 text-amber-400",
  fulfilled: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
};
const NEXT_ACTIONS: Record<string, { status: string; label: string }[]> = {
  new: [
    { status: "confirmed", label: "Potvrdi" },
    { status: "fulfilled", label: "Isporuči" },
  ],
  confirmed: [
    { status: "ready", label: "Spremno" },
    { status: "fulfilled", label: "Isporuči" },
  ],
  ready: [{ status: "fulfilled", label: "Isporuči" }],
  fulfilled: [],
  cancelled: [],
};

function rsd(n: number) {
  return new Intl.NumberFormat("sr-RS").format(n) + " RSD";
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Order | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (statusFilter) sp.set("status", statusFilter);
      if (search.trim()) sp.set("q", search.trim());
      const res = await fetch(`/api/admin/orders?${sp.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.push("/staff-login");
        return;
      }
      if (res.ok) setOrders((await res.json()).orders || []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  async function openDetail(order: Order) {
    const res = await fetch(`/api/admin/orders/${order.id}`);
    if (res.ok) setExpanded((await res.json()).order);
    else setExpanded(order);
  }

  async function changeStatus(order: Order, status: string) {
    let cancelledReason: string | undefined;
    if (status === "cancelled") {
      cancelledReason = window.prompt("Razlog otkazivanja:") || "";
      if (!cancelledReason.trim()) return;
    }
    if (status === "fulfilled" && !window.confirm("Označiti kao isporučeno? Zalihe će biti umanjene.")) return;

    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, cancelledReason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Greška" });
      return;
    }
    setMessage({ type: "success", text: "Status ažuriran" });
    setExpanded(null);
    load();
  }

  return (
    <div className="relative">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Porudžbine</h1>
        <p className="text-foreground-muted mt-1">Porudžbine iz online prodavnice</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-white font-medium ${message.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži (ime, telefon, broj)..."
          className="flex-1 px-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
        >
          <option value="">Svi statusi</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-background-secondary border border-border rounded-2xl p-12 text-center text-foreground-muted">
          Nema porudžbina
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-background-secondary border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => (expanded?.id === o.id ? setExpanded(null) : openDetail(o))}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">#{o.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-muted truncate">
                    {o.customerName} · {o.fulfillmentType === "delivery" ? "Dostava" : "Preuzimanje"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{rsd(o.totalRsd)}</p>
                  <p className="text-xs text-foreground-muted">
                    {new Date(o.createdAt).toLocaleDateString("sr-RS")}
                  </p>
                </div>
              </button>

              {expanded?.id === o.id && (
                <div className="border-t border-border p-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-foreground-muted">Kupac</p>
                      <p className="text-foreground">{expanded.customerName}</p>
                      <a href={`tel:${expanded.customerPhone}`} className="text-accent">{expanded.customerPhone}</a>
                      {expanded.customerEmail && <p className="text-foreground-muted">{expanded.customerEmail}</p>}
                    </div>
                    <div>
                      <p className="text-foreground-muted">
                        {expanded.fulfillmentType === "delivery" ? "Adresa za dostavu" : "Preuzimanje u teretani"}
                      </p>
                      {expanded.deliveryAddress && <p className="text-foreground">{expanded.deliveryAddress}</p>}
                      {expanded.note && <p className="text-foreground-muted mt-1">Napomena: {expanded.note}</p>}
                    </div>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden">
                    {(expanded.items || []).map((it) => (
                      <div key={it.id} className="flex justify-between px-3 py-2 text-sm border-b border-border last:border-0">
                        <span className="text-foreground">{it.productNameCached} × {it.quantity}</span>
                        <span className="text-foreground">{rsd(it.lineTotalRsd)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 text-sm bg-white/5">
                      <span className="text-foreground-muted">Ukupno</span>
                      <span className="font-semibold text-foreground">{rsd(expanded.totalRsd)}</span>
                    </div>
                  </div>

                  {expanded.cancelledReason && (
                    <p className="text-sm text-red-400">Otkazano: {expanded.cancelledReason}</p>
                  )}

                  {NEXT_ACTIONS[expanded.status]?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {NEXT_ACTIONS[expanded.status].map((a) => (
                        <button
                          key={a.status}
                          onClick={() => changeStatus(expanded, a.status)}
                          className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium"
                        >
                          {a.label}
                        </button>
                      ))}
                      <button
                        onClick={() => changeStatus(expanded, "cancelled")}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-400 text-sm font-medium"
                      >
                        Otkaži
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
