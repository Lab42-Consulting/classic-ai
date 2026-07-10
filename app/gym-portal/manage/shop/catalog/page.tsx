"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  displayOrder: number | null;
  _count?: { products: number };
}

interface Brand {
  id: string;
  name: string;
  logoUrl: string | null;
  _count?: { products: number };
}

// Common Serbian nutrition-shop categories for quick setup
const DEFAULT_CATEGORIES = [
  "Proteini",
  "Kreatini",
  "Aminokiseline",
  "Pre-workout",
  "Vitamini i minerali",
  "Sagorevači masti",
  "Stimulatori hormona",
  "Oprema",
  "Zdrava ishrana",
];

export default function CatalogManagementPage() {
  const [tab, setTab] = useState<"categories" | "brands">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newCategory, setNewCategory] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState("");
  const [newBrand, setNewBrand] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  async function loadAll() {
    setLoading(true);
    try {
      const [catRes, brandRes] = await Promise.all([
        fetch("/api/owner/categories"),
        fetch("/api/admin/brands"),
      ]);
      if (catRes.ok) setCategories((await catRes.json()).categories || []);
      if (brandRes.ok) setBrands((await brandRes.json()).brands || []);
    } catch {
      setMessage({ type: "error", text: "Greška pri učitavanju" });
    } finally {
      setLoading(false);
    }
  }

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  async function createCategory(name: string, parentId?: string) {
    if (!name.trim()) return;
    const res = await fetch("/api/owner/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), parentId: parentId || null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Greška" });
      return;
    }
    setMessage({ type: "success", text: "Kategorija dodata" });
    setNewCategory("");
    setNewCategoryParent("");
    loadAll();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Obrisati kategoriju?")) return;
    const res = await fetch(`/api/owner/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Greška" });
      return;
    }
    setMessage({ type: "success", text: "Kategorija obrisana" });
    loadAll();
  }

  async function quickAddDefaults() {
    const existing = new Set(categories.map((c) => c.name.toLowerCase()));
    const toAdd = DEFAULT_CATEGORIES.filter((n) => !existing.has(n.toLowerCase()));
    if (toAdd.length === 0) {
      setMessage({ type: "success", text: "Sve podrazumevane kategorije već postoje" });
      return;
    }
    for (const name of toAdd) {
      await fetch("/api/owner/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }
    setMessage({ type: "success", text: `Dodato ${toAdd.length} kategorija` });
    loadAll();
  }

  async function createBrand() {
    if (!newBrand.trim()) return;
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBrand.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Greška" });
      return;
    }
    setMessage({ type: "success", text: "Brend dodat" });
    setNewBrand("");
    loadAll();
  }

  async function deleteBrand(id: string) {
    if (!confirm("Obrisati brend?")) return;
    const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Greška" });
      return;
    }
    setMessage({ type: "success", text: "Brend obrisan" });
    loadAll();
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/gym-portal/manage/shop" className="text-sm text-foreground-muted hover:text-foreground">
            ← Nazad na Magacin
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">Kategorije i brendovi</h1>
          <p className="text-foreground-muted mt-1">Uredite katalog za prodavnicu</p>
        </div>
        <div className="flex gap-1 p-1 bg-background-secondary rounded-xl">
          <button
            onClick={() => setTab("categories")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "categories" ? "bg-accent text-white" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Kategorije
          </button>
          <button
            onClick={() => setTab("brands")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "brands" ? "bg-accent text-white" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Brendovi
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-white font-medium ${
            message.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : tab === "categories" ? (
        <div className="space-y-4">
          {/* Add top-level category */}
          <div className="bg-background-secondary border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Naziv kategorije (npr. Proteini)"
              className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
            />
            <select
              value={newCategoryParent}
              onChange={(e) => setNewCategoryParent(e.target.value)}
              className="px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">Glavna kategorija</option>
              {topLevel.map((c) => (
                <option key={c.id} value={c.id}>
                  Potkategorija u: {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => createCategory(newCategory, newCategoryParent)}
              className="px-4 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl"
            >
              Dodaj
            </button>
          </div>

          {topLevel.length === 0 ? (
            <div className="bg-background-secondary border border-border rounded-2xl p-8 text-center">
              <p className="text-foreground-muted mb-4">Nema kategorija</p>
              <button onClick={quickAddDefaults} className="px-4 py-2.5 bg-accent text-white rounded-xl font-medium">
                Dodaj podrazumevane kategorije
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {topLevel.map((cat) => (
                <div key={cat.id} className="bg-background-secondary border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-foreground-muted">{cat._count?.products ?? 0} proizvoda</span>
                      <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-300 text-sm">
                        Obriši
                      </button>
                    </div>
                  </div>
                  {/* Subcategories */}
                  <div className="mt-2 pl-4 border-l border-border space-y-1">
                    {childrenOf(cat.id).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-1">
                        <span className="text-sm text-foreground-muted">↳ {sub.name}</span>
                        <button onClick={() => deleteCategory(sub.id)} className="text-red-400 hover:text-red-300 text-xs">
                          Obriši
                        </button>
                      </div>
                    ))}
                    <SubcategoryAdder parentId={cat.id} onAdd={createCategory} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-background-secondary border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Naziv brenda (npr. Optimum Nutrition)"
              className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
            />
            <button onClick={createBrand} className="px-4 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl">
              Dodaj
            </button>
          </div>
          {brands.length === 0 ? (
            <div className="bg-background-secondary border border-border rounded-2xl p-8 text-center text-foreground-muted">
              Nema brendova
            </div>
          ) : (
            <div className="space-y-2">
              {brands.map((b) => (
                <div key={b.id} className="bg-background-secondary border border-border rounded-2xl p-4 flex items-center justify-between">
                  <span className="font-medium text-foreground">{b.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground-muted">{b._count?.products ?? 0} proizvoda</span>
                    <button onClick={() => deleteBrand(b.id)} className="text-red-400 hover:text-red-300 text-sm">
                      Obriši
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubcategoryAdder({
  parentId,
  onAdd,
}: {
  parentId: string;
  onAdd: (name: string, parentId?: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+ Dodaj potkategoriju"
        className="flex-1 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
      />
      <button
        onClick={() => {
          onAdd(value, parentId);
          setValue("");
        }}
        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-foreground rounded-lg text-sm"
      >
        Dodaj
      </button>
    </div>
  );
}
