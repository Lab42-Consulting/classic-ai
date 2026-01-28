"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  imageUrl: string | null;
  category: string | null;
  price: number;
  costPrice: number | null;
  currentStock: number;
  lowStockAlert: number | null;
  isActive: boolean;
  createdAt: string;
}

interface Sale {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  memberName: string | null;
  staffName: string | null;
  paymentMethod: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    category: string | null;
  };
}

interface Member {
  id: string;
  name: string;
  memberId: string;
}

const CATEGORY_GROUPS = ["Suplementi", "Hrana i Pića", "Ostalo"] as const;

const CATEGORIES = [
  // Supplements
  { value: "protein", label: "Proteini", group: "Suplementi" },
  { value: "preworkout", label: "Pre-workout", group: "Suplementi" },
  { value: "creatine", label: "Kreatin", group: "Suplementi" },
  { value: "bcaa", label: "BCAA / Amino", group: "Suplementi" },
  { value: "mass-gainer", label: "Mass gainer", group: "Suplementi" },
  { value: "vitamins", label: "Vitamini", group: "Suplementi" },
  { value: "fat-burner", label: "Fat burner", group: "Suplementi" },
  // Food & Drinks
  { value: "protein-bar", label: "Protein bar", group: "Hrana i Pića" },
  { value: "energy-bar", label: "Energetske pločice", group: "Hrana i Pića" },
  { value: "protein-shake", label: "Protein shake", group: "Hrana i Pića" },
  { value: "energy-drink", label: "Energetska pića", group: "Hrana i Pića" },
  { value: "water", label: "Voda", group: "Hrana i Pića" },
  { value: "snacks", label: "Grickalice", group: "Hrana i Pića" },
  // Other
  { value: "merchandise", label: "Merchandising", group: "Ostalo" },
  { value: "accessories", label: "Oprema", group: "Ostalo" },
  { value: "other", label: "Ostalo", group: "Ostalo" },
] as const;

export default function ShopPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"products" | "sales">("products");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  // Slide-in panel state
  const [showPanel, setShowPanel] = useState(false);
  const [panelMode, setPanelMode] = useState<"product" | "stock" | "sale">("product");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    sku: "",
    imageUrl: "",
    category: "",
    price: "",
    costPrice: "",
    currentStock: "0",
    lowStockAlert: "",
    isActive: true,
  });

  // Stock adjustment state
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    type: "purchase",
    quantity: "",
    note: "",
  });

  // Sales state
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesSummary, setSalesSummary] = useState({ totalSales: 0, totalRevenue: 0, totalUnits: 0 });
  const [members, setMembers] = useState<Member[]>([]);
  const [saleForm, setSaleForm] = useState({
    productId: "",
    quantity: "1",
    memberId: "",
    paymentMethod: "cash",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === "sales") {
      fetchSales();
      fetchMembers();
    }
  }, [activeTab]);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/admin/products");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/staff-login");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch {
      setMessage({ type: "error", text: "Greška pri učitavanju proizvoda" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      const response = await fetch("/api/admin/sales?limit=100");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSales(data.sales || []);
      setSalesSummary(data.summary || { totalSales: 0, totalRevenue: 0, totalUnits: 0 });
    } catch {
      setMessage({ type: "error", text: "Greška pri učitavanju prodaje" });
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/gym/members");
      if (!response.ok) return;
      const data = await response.json();
      setMembers(data.members || []);
    } catch {
      // Silently fail
    }
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    const matchesStock = stockFilter === "all" ||
      (stockFilter === "out" && product.currentStock === 0) ||
      (stockFilter === "low" && product.lowStockAlert && product.currentStock <= product.lowStockAlert && product.currentStock > 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const openProductPanel = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || "",
        sku: product.sku || "",
        imageUrl: product.imageUrl || "",
        category: product.category || "",
        price: (product.price).toString(),
        costPrice: product.costPrice ? (product.costPrice).toString() : "",
        currentStock: product.currentStock.toString(),
        lowStockAlert: product.lowStockAlert?.toString() || "",
        isActive: product.isActive,
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: "",
        description: "",
        sku: "",
        imageUrl: "",
        category: "",
        price: "",
        costPrice: "",
        currentStock: "0",
        lowStockAlert: "",
        isActive: true,
      });
    }
    setPanelMode("product");
    setShowPanel(true);
  };

  const openStockPanel = (product: Product) => {
    setStockProduct(product);
    setStockAdjustment({ type: "purchase", quantity: "", note: "" });
    setPanelMode("stock");
    setShowPanel(true);
  };

  const openSalePanel = () => {
    setSaleForm({ productId: "", quantity: "1", memberId: "", paymentMethod: "cash" });
    setPanelMode("sale");
    setShowPanel(true);
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditingProduct(null);
    setStockProduct(null);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      setMessage({ type: "error", text: "Naziv proizvoda je obavezan" });
      return;
    }

    if (!productForm.price || parseFloat(productForm.price) < 0) {
      setMessage({ type: "error", text: "Unesite validnu cenu" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        sku: productForm.sku.trim() || null,
        imageUrl: productForm.imageUrl || null,
        category: productForm.category || null,
        price: Math.round(parseFloat(productForm.price)),
        costPrice: productForm.costPrice ? Math.round(parseFloat(productForm.costPrice)) : null,
        currentStock: parseInt(productForm.currentStock) || 0,
        lowStockAlert: productForm.lowStockAlert ? parseInt(productForm.lowStockAlert) : null,
        isActive: productForm.isActive,
      };

      const response = await fetch(
        editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products",
        {
          method: editingProduct ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška pri čuvanju");
      }

      setMessage({ type: "success", text: editingProduct ? "Proizvod ažuriran" : "Proizvod dodat" });
      closePanel();
      fetchProducts();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Greška pri čuvanju",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Da li ste sigurni da želite da obrišete "${product.name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška pri brisanju");
      }

      setMessage({ type: "success", text: "Proizvod obrisan" });
      fetchProducts();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Greška pri brisanju",
      });
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockProduct || !stockAdjustment.quantity) return;

    const quantity = parseInt(stockAdjustment.quantity);
    if (isNaN(quantity) || quantity === 0) {
      setMessage({ type: "error", text: "Unesite validnu količinu" });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/products/${stockProduct.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: stockAdjustment.type,
          quantity: stockAdjustment.type === "adjustment" ? quantity : Math.abs(quantity),
          note: stockAdjustment.note || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška pri ažuriranju zaliha");
      }

      setMessage({ type: "success", text: "Zalihe ažurirane" });
      closePanel();
      fetchProducts();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Greška pri ažuriranju",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordSale = async () => {
    if (!saleForm.productId) {
      setMessage({ type: "error", text: "Izaberite proizvod" });
      return;
    }

    const quantity = parseInt(saleForm.quantity);
    if (isNaN(quantity) || quantity < 1) {
      setMessage({ type: "error", text: "Količina mora biti najmanje 1" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: saleForm.productId,
          quantity,
          memberId: saleForm.memberId || null,
          paymentMethod: saleForm.paymentMethod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška pri evidentiranju prodaje");
      }

      setMessage({ type: "success", text: "Prodaja evidentirana" });
      closePanel();
      fetchSales();
      fetchProducts();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Greška pri evidentiranju",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Molimo izaberite sliku" });
      return;
    }

    if (file.size > 1024 * 1024) {
      setMessage({ type: "error", text: "Slika mora biti manja od 1MB" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProductForm({ ...productForm, imageUrl: event.target?.result as string });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("sr-RS").format(amount) + " RSD";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Prodavnica</h1>
          <p className="text-foreground-muted mt-1">
            Upravljajte proizvodima i pratite prodaju
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-background-secondary rounded-xl">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "products"
                ? "bg-accent text-white shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Proizvodi
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "sales"
                ? "bg-accent text-white shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Prodaja
          </button>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div
          className={`fixed top-20 right-4 z-[60] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-toast-in ${
            message.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {message.type === "success" ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Pretraži proizvode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              >
                <option value="">Sve kategorije</option>
                {CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {CATEGORIES.filter((c) => c.group === group).map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as "all" | "low" | "out")}
                className="px-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
              >
                <option value="all">Sve zalihe</option>
                <option value="low">Niske zalihe</option>
                <option value="out">Nema na stanju</option>
              </select>

              <button
                onClick={() => openProductPanel()}
                className="px-4 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Novi proizvod</span>
              </button>
            </div>
          </div>

          {/* Products Table */}
          {filteredProducts.length === 0 ? (
            <div className="bg-background-secondary border border-border rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery || categoryFilter || stockFilter !== "all"
                  ? "Nema rezultata"
                  : "Nema proizvoda"}
              </h3>
              <p className="text-foreground-muted">
                {searchQuery || categoryFilter || stockFilter !== "all"
                  ? "Promenite filter kriterijume"
                  : "Dodajte prvi proizvod da započnete"}
              </p>
            </div>
          ) : (
            <div className="bg-background-secondary border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-white/5">
                      <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Proizvod</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden sm:table-cell">Kategorija</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-foreground-muted">Cena</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted">Zalihe</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden sm:table-cell">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-foreground-muted">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-border last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{product.name}</p>
                              {product.sku && <p className="text-xs text-foreground-muted">{product.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {product.category ? (
                            <span className="px-2 py-1 bg-white/10 rounded-lg text-xs text-foreground">
                              {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                            </span>
                          ) : (
                            <span className="text-foreground-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-foreground">{formatPrice(product.price)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                              product.currentStock === 0
                                ? "bg-red-500/20 text-red-400"
                                : product.lowStockAlert && product.currentStock <= product.lowStockAlert
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {product.currentStock} kom
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span
                            className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                              product.isActive
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {product.isActive ? "Aktivan" : "Neaktivan"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openStockPanel(product)}
                              title="Zalihe"
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-foreground-muted hover:text-foreground"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => openProductPanel(product)}
                              title="Izmeni"
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-foreground-muted hover:text-foreground"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product)}
                              title="Obriši"
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-foreground-muted hover:text-red-400"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stats bar */}
          <div className="mt-4 flex items-center justify-between text-sm text-foreground-muted">
            <span>{filteredProducts.length} od {products.length} proizvoda</span>
            <span>
              Ukupna vrednost zaliha:{" "}
              <span className="font-medium text-foreground">
                {formatPrice(products.reduce((sum, p) => sum + p.price * p.currentStock, 0))}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {activeTab === "sales" && (
        <div>
          {/* Summary Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Ukupno prodaja</p>
                  <p className="text-2xl font-bold text-foreground">{salesSummary.totalSales}</p>
                </div>
              </div>
            </div>
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Ukupan prihod</p>
                  <p className="text-2xl font-bold text-accent">{formatPrice(salesSummary.totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-foreground-muted">Prodatih jedinica</p>
                  <p className="text-2xl font-bold text-foreground">{salesSummary.totalUnits}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-foreground">Istorija prodaje</h2>
            <button
              onClick={openSalePanel}
              className="px-4 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nova prodaja
            </button>
          </div>

          {/* Sales Table */}
          {sales.length === 0 ? (
            <div className="bg-background-secondary border border-border rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nema prodaja</h3>
              <p className="text-foreground-muted">Evidentirana prodaja će se prikazati ovde</p>
            </div>
          ) : (
            <div className="bg-background-secondary border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-white/5">
                      <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Datum</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Proizvod</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted">Kol.</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-foreground-muted">Ukupno</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden sm:table-cell">Kupac</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden md:table-cell">Plaćanje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground-muted whitespace-nowrap">
                          {formatDate(sale.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground font-medium">{sale.product.name}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-foreground">{sale.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold text-accent">
                          {formatPrice(sale.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-foreground-muted hidden sm:table-cell">
                          {sale.memberName || "-"}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="px-2 py-1 bg-white/10 rounded text-xs text-foreground">
                            {sale.paymentMethod === "cash" ? "Gotovina" : sale.paymentMethod === "card" ? "Kartica" : sale.paymentMethod || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-in Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-background-secondary border-l border-border shadow-2xl z-50 flex flex-col animate-slide-in-right">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {panelMode === "product" && (editingProduct ? "Izmeni proizvod" : "Novi proizvod")}
                {panelMode === "stock" && "Podesi zalihe"}
                {panelMode === "sale" && "Nova prodaja"}
              </h2>
              <button
                onClick={closePanel}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-foreground-muted hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Product Form */}
              {panelMode === "product" && (
                <div className="space-y-5">
                  {/* Image Upload - Centered */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3 text-center">Slika proizvoda</label>
                    <div className="flex justify-center">
                      {productForm.imageUrl ? (
                        <div className="relative">
                          <img
                            src={productForm.imageUrl}
                            alt="Preview"
                            className="w-40 h-40 rounded-2xl object-cover border border-border"
                          />
                          <button
                            onClick={() => setProductForm({ ...productForm, imageUrl: "" })}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-40 h-40 border-2 border-dashed border-border hover:border-accent rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-accent/10 flex items-center justify-center transition-colors">
                            <svg className="w-6 h-6 text-foreground-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <span className="text-sm text-foreground-muted group-hover:text-foreground transition-colors">Dodaj sliku</span>
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Naziv *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                      placeholder="Npr. Protein bar"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Opis</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent resize-none"
                      placeholder="Kratak opis proizvoda"
                    />
                  </div>

                  {/* Category & SKU */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Kategorija</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
                      >
                        <option value="">Izaberi...</option>
                        {CATEGORY_GROUPS.map((group) => (
                          <optgroup key={group} label={group}>
                            {CATEGORIES.filter((c) => c.group === group).map((cat) => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Šifra</label>
                      <input
                        type="text"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                        placeholder="SKU"
                      />
                    </div>
                  </div>

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Cena (RSD) *</label>
                      <input
                        type="number"
                        min="0"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Nabavna (RSD)</label>
                      <input
                        type="number"
                        min="0"
                        value={productForm.costPrice}
                        onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                        placeholder="Opciono"
                      />
                    </div>
                  </div>

                  {/* Stock (only for new products) */}
                  {!editingProduct && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Količina</label>
                        <input
                          type="number"
                          min="0"
                          value={productForm.currentStock}
                          onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })}
                          className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Upozorenje</label>
                        <input
                          type="number"
                          min="0"
                          value={productForm.lowStockAlert}
                          onChange={(e) => setProductForm({ ...productForm, lowStockAlert: e.target.value })}
                          className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                          placeholder="Min. količina"
                        />
                      </div>
                    </div>
                  )}

                  {/* Active Toggle - Redesigned */}
                  <div
                    onClick={() => setProductForm({ ...productForm, isActive: !productForm.isActive })}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      productForm.isActive
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-white/5 border-border hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        productForm.isActive ? "bg-emerald-500/20" : "bg-white/10"
                      }`}>
                        {productForm.isActive ? (
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${productForm.isActive ? "text-emerald-400" : "text-foreground"}`}>
                          {productForm.isActive ? "Aktivan" : "Neaktivan"}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          {productForm.isActive ? "Proizvod je dostupan za prodaju" : "Proizvod nije vidljiv u prodaji"}
                        </p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      productForm.isActive ? "border-emerald-400 bg-emerald-400" : "border-foreground-muted"
                    }`}>
                      {productForm.isActive && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stock Adjustment Form */}
              {panelMode === "stock" && stockProduct && (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      {stockProduct.imageUrl ? (
                        <img src={stockProduct.imageUrl} alt={stockProduct.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                          <svg className="w-6 h-6 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{stockProduct.name}</p>
                        <p className="text-sm text-foreground-muted">Trenutno: {stockProduct.currentStock} kom</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tip promene</label>
                    <select
                      value={stockAdjustment.type}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, type: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="purchase">Nabavka (+)</option>
                      <option value="return">Povraćaj (+)</option>
                      <option value="adjustment">Korekcija (+/-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Količina</label>
                    <input
                      type="number"
                      value={stockAdjustment.quantity}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                      placeholder={stockAdjustment.type === "adjustment" ? "+10 ili -5" : "10"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Napomena</label>
                    <input
                      type="text"
                      value={stockAdjustment.note}
                      onChange={(e) => setStockAdjustment({ ...stockAdjustment, note: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent"
                      placeholder="Npr. Nova dostava"
                    />
                  </div>
                </div>
              )}

              {/* Sale Form */}
              {panelMode === "sale" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Proizvod *</label>
                    <select
                      value={saleForm.productId}
                      onChange={(e) => setSaleForm({ ...saleForm, productId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Izaberi proizvod...</option>
                      {products
                        .filter((p) => p.isActive && p.currentStock > 0)
                        .map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatPrice(product.price)} ({product.currentStock} na stanju)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Količina</label>
                    <input
                      type="number"
                      min="1"
                      value={saleForm.quantity}
                      onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Kupac</label>
                    <select
                      value={saleForm.memberId}
                      onChange={(e) => setSaleForm({ ...saleForm, memberId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="">Nepoznat kupac</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.memberId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Plaćanje</label>
                    <select
                      value={saleForm.paymentMethod}
                      onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="cash">Gotovina</option>
                      <option value="card">Kartica</option>
                      <option value="other">Ostalo</option>
                    </select>
                  </div>

                  {/* Total preview */}
                  {saleForm.productId && (
                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-foreground">Ukupno:</span>
                        <span className="text-2xl font-bold text-accent">
                          {formatPrice(
                            (products.find((p) => p.id === saleForm.productId)?.price || 0) *
                              (parseInt(saleForm.quantity) || 1)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={closePanel}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-foreground rounded-xl transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={() => {
                  if (panelMode === "product") handleSaveProduct();
                  if (panelMode === "stock") handleStockAdjustment();
                  if (panelMode === "sale") handleRecordSale();
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {panelMode === "product" && "Sačuvaj"}
                    {panelMode === "stock" && "Primeni"}
                    {panelMode === "sale" && "Evidentiraj"}
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
        @keyframes toast-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-toast-in {
          animation: toast-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
