"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  role: string;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  logo: string | null;
  slug: string | null;
  memberCount: number;
  staffCount: number;
  staff?: StaffMember[];
}

interface NewLocationForm {
  name: string;
  address: string;
  logo: string | null;
  primaryColor: string;
  slug: string;
}

interface NewAdminForm {
  name: string;
  gymId: string;
}

interface EditLocationForm {
  id: string;
  name: string;
  address: string;
  slug: string;
}

export default function LocationsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [showAddAdminModal, setShowAddAdminModal] = useState<string | null>(null);
  const [newCredentials, setNewCredentials] = useState<{
    staffId: string;
    pin: string;
    gymName: string;
    adminName?: string;
  } | null>(null);
  const [locationCreated, setLocationCreated] = useState<{
    gymName: string;
    message: string;
  } | null>(null);

  const [form, setForm] = useState<NewLocationForm>({
    name: "",
    address: "",
    logo: null,
    primaryColor: "#ef4444",
    slug: "",
  });

  const [slugError, setSlugError] = useState<string | null>(null);

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
    const formatted = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setForm({ ...form, slug: formatted });
    setSlugError(validateSlug(formatted));
  };

  const handleEditSlugChange = (value: string) => {
    const formatted = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setEditForm({ ...editForm, slug: formatted });
    setEditSlugError(validateSlug(formatted));
  };

  const openEditModal = (location: Location) => {
    setEditForm({
      id: location.id,
      name: location.name,
      address: location.address || "",
      slug: location.slug || "",
    });
    setEditSlugError(null);
    setShowEditModal(location.id);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate slug if provided
    const slugValidationError = validateSlug(editForm.slug);
    if (slugValidationError) {
      setEditSlugError(slugValidationError);
      setError(slugValidationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/locations/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          address: editForm.address || null,
          slug: editForm.slug || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Greška pri ažuriranju lokacije");
      }

      setShowEditModal(null);
      fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [adminForm, setAdminForm] = useState<NewAdminForm>({
    name: "",
    gymId: "",
  });

  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditLocationForm>({
    id: "",
    name: "",
    address: "",
    slug: "",
  });
  const [editSlugError, setEditSlugError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/locations");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/staff-login");
          return;
        }
        throw new Error("Failed to fetch locations");
      }
      const data = await response.json();
      setLocations(data.locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLocationStaff = async (gymId: string) => {
    try {
      const response = await fetch(`/api/admin/locations/${gymId}/staff`);
      if (response.ok) {
        const data = await response.json();
        setLocations(prev => prev.map(loc =>
          loc.id === gymId ? { ...loc, staff: data.staff } : loc
        ));
      }
    } catch {
      // Handle silently
    }
  };

  const handleExpand = async (locationId: string) => {
    if (expandedLocation === locationId) {
      setExpandedLocation(null);
    } else {
      setExpandedLocation(locationId);
      const location = locations.find(l => l.id === locationId);
      if (!location?.staff) {
        await fetchLocationStaff(locationId);
      }
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo mora biti manji od 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm({ ...form, logo: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Naziv lokacije je obavezan");
      return;
    }

    // Validate slug if provided
    const slugValidationError = validateSlug(form.slug);
    if (slugValidationError) {
      setSlugError(slugValidationError);
      setError(slugValidationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Greška pri kreiranju lokacije");
      }

      // Check if owner uses same credentials (no new credentials needed)
      if (data.sameCredentials) {
        setLocationCreated({
          gymName: data.location.name,
          message: data.message || "Koristite iste kredencijale za prijavu na novu lokaciju",
        });
      } else if (data.credentials) {
        setNewCredentials({
          staffId: data.credentials.staffId,
          pin: data.credentials.pin,
          gymName: data.location.name,
        });
      }

      setForm({ name: "", address: "", logo: null, primaryColor: "#ef4444", slug: "" });
      setShowAddModal(false);
      fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.name.trim() || !adminForm.gymId) {
      setError("Ime admina je obavezno");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/locations/${adminForm.gymId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: adminForm.name, role: "admin" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Greška pri dodavanju admina");
      }

      setNewCredentials({
        staffId: data.credentials.staffId,
        pin: data.credentials.pin,
        gymName: locations.find(l => l.id === adminForm.gymId)?.name || "",
        adminName: adminForm.name,
      });

      setAdminForm({ name: "", gymId: "" });
      setShowAddAdminModal(null);
      fetchLocations();
      // Refresh staff list for this location
      fetchLocationStaff(adminForm.gymId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-muted">Učitavanje lokacija...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border border-accent/20 p-5 sm:p-8 mb-6 sm:mb-8">
        <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                Vaše Lokacije
              </h1>
              <p className="text-sm sm:text-base text-foreground-muted">
                {locations.length} {locations.length === 1 ? "lokacija" : locations.length < 5 ? "lokacije" : "lokacija"}
              </p>
            </div>
          </div>
          <p className="text-sm sm:text-base text-foreground-muted max-w-xl hidden sm:block">
            Upravljajte svim lokacijama vaše teretane. Dodajte nove lokacije i dodelite administratore za svaku od njih.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Sve lokacije</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 sm:px-5 py-2 sm:py-2.5 bg-accent hover:bg-accent/90 text-white text-sm sm:text-base font-medium rounded-lg sm:rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25 flex items-center gap-1.5 sm:gap-2"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
Nova lokacija
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-500/20 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Locations List */}
      <div className="space-y-3 sm:space-y-4">
        {locations.map((location, index) => (
          <div
            key={location.id}
            className="bg-background-secondary border border-border rounded-xl sm:rounded-2xl overflow-hidden transition-all hover:border-accent/20"
          >
            {/* Location Header */}
            <div
              className="p-4 sm:p-5 cursor-pointer"
              onClick={() => handleExpand(location.id)}
            >
              {/* Mobile Layout */}
              <div className="sm:hidden">
                <div className="flex items-start gap-3">
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0 overflow-hidden border border-accent/10">
                    {location.logo ? (
                      <img src={location.logo} alt={location.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-accent">
                        {location.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base text-foreground">{location.name}</h3>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded-full">
                          Glavna
                        </span>
                      )}
                    </div>
                    {location.address && (
                      <p className="text-xs text-foreground-muted mt-0.5 line-clamp-1">
                        {location.address}
                      </p>
                    )}
                  </div>

                  {/* Expand Icon */}
                  <div className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${expandedLocation === location.id ? 'bg-accent/10 rotate-180' : 'bg-white/5'}`}>
                    <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Mobile Action Row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  {/* Stats */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{location.memberCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>{location.staffCount}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {location.slug ? (
                      <a
                        href={`/gym-portal/${location.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg hover:bg-blue-500/10 transition-colors text-foreground-muted hover:text-blue-400"
                        title="Pogledaj marketing stranicu"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(location);
                      }}
                      className="p-2 rounded-lg hover:bg-accent/10 transition-colors text-foreground-muted hover:text-accent"
                      title="Izmeni lokaciju"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex items-center gap-4">
                {/* Logo */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0 overflow-hidden border border-accent/10">
                  {location.logo ? (
                    <img src={location.logo} alt={location.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-accent">
                      {location.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground truncate">{location.name}</h3>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full flex-shrink-0">
                        Glavna
                      </span>
                    )}
                  </div>
                  {location.address && (
                    <p className="text-sm text-foreground-muted truncate flex items-center gap-1.5 mt-0.5">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{location.address}</span>
                    </p>
                  )}
                  {location.slug && (
                    <p className="text-xs text-blue-400 truncate flex items-center gap-1.5 mt-0.5">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="truncate">/gym-portal/{location.slug}</span>
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{location.memberCount}</p>
                    <p className="text-xs text-foreground-muted">članova</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{location.staffCount}</p>
                    <p className="text-xs text-foreground-muted">osoblja</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Preview Button */}
                  {location.slug ? (
                    <a
                      href={`/gym-portal/${location.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl hover:bg-blue-500/10 transition-colors text-foreground-muted hover:text-blue-400"
                      title="Pogledaj marketing stranicu"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </a>
                  ) : (
                    <div className="w-9 h-9" />
                  )}

                  {/* Edit Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(location);
                    }}
                    className="p-2 rounded-xl hover:bg-accent/10 transition-colors text-foreground-muted hover:text-accent"
                    title="Izmeni lokaciju"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Expand Icon */}
                  <div className={`p-2 rounded-xl transition-all ${expandedLocation === location.id ? 'bg-accent/10 rotate-180' : 'bg-white/5'}`}>
                    <svg className="w-5 h-5 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedLocation === location.id && (
              <div className="border-t border-border bg-background/50 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h4 className="text-sm sm:text-base font-medium text-foreground flex items-center gap-2">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Osoblje
                  </h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminForm({ name: "", gymId: location.id });
                      setShowAddAdminModal(location.id);
                    }}
                    className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-accent hover:bg-accent/10 rounded-lg transition-colors flex items-center gap-1 sm:gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="hidden sm:inline">Dodaj admina</span>
                    <span className="sm:hidden">Dodaj</span>
                  </button>
                </div>

                {location.staff ? (
                  location.staff.length > 0 ? (
                    <div className="grid gap-2">
                      {location.staff.map((staff) => (
                        <div
                          key={staff.id}
                          className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-background rounded-lg sm:rounded-xl border border-border"
                        >
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-accent">
                              {staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-base font-medium text-foreground truncate">{staff.name}</p>
                            <p className="text-[10px] sm:text-xs text-foreground-muted font-mono">{staff.staffId}</p>
                          </div>
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg flex-shrink-0 ${
                            staff.role.toLowerCase() === 'owner'
                              ? 'bg-amber-500/10 text-amber-400'
                              : staff.role.toLowerCase() === 'admin'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {staff.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-foreground-muted">
                      <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      <p>Nema registrovanog osoblja</p>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {locations.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Dodajte prvu lokaciju</h3>
          <p className="text-foreground-muted mb-6 max-w-sm mx-auto">
            Kreirajte novu lokaciju vaše teretane i dodelite joj administratora.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25"
          >
            Dodaj lokaciju
          </button>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
                  <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Nova lokacija</h2>
                  <p className="text-sm text-foreground-muted">Proširite vaš poslovni prostor</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Info Box */}
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-400 mb-1">Šta dobijate?</p>
                    <ul className="text-xs text-foreground-muted space-y-1">
                      <li className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Nova teretana u sistemu povezana sa vašim nalogom
                      </li>
                      <li className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Koristite iste pristupne podatke (Staff ID + PIN) za tu lokaciju
                      </li>
                      <li className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Odvojen sistem članova i osoblja za tu lokaciju
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Basic Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground-muted">
                  <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center">1</span>
                  Osnovne informacije
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Naziv lokacije <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="npr. Classic Gym Centar"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Adresa <span className="text-foreground-muted text-xs font-normal">(opciono)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="npr. Bulevar Mihajla Pupina 10"
                      className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    URL slug <span className="text-foreground-muted text-xs font-normal">(opciono)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted text-sm">
                      /gym-portal/
                    </div>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="npr. centar"
                      className={`w-full pl-24 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 transition-all ${
                        slugError
                          ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                          : "border-border focus:border-accent focus:ring-accent/20"
                      }`}
                    />
                  </div>
                  {slugError && (
                    <p className="text-xs text-red-400 mt-1.5">{slugError}</p>
                  )}
                  <p className="text-xs text-foreground-muted mt-1.5">
                    Jedinstveni URL za marketing stranicu ove lokacije
                  </p>
                </div>
              </div>

              {/* Branding Section */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground-muted">
                  <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center">2</span>
                  Brendiranje <span className="text-foreground-muted/60 text-xs font-normal ml-1">(opciono)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Logo</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative aspect-square rounded-2xl border-2 border-dashed cursor-pointer flex items-center justify-center overflow-hidden transition-all group ${
                        form.logo ? 'border-accent/50 bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-accent/5'
                      }`}
                    >
                      {form.logo ? (
                        <>
                          <img src={form.logo} alt="Logo preview" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Promeni</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <svg className="w-8 h-8 text-foreground-muted group-hover:text-accent mx-auto mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs text-foreground-muted group-hover:text-foreground transition-colors">
                            Klikni za upload
                          </p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <p className="text-xs text-foreground-muted/60 mt-2 text-center">
                      Max 2MB • Koristi se logo glavne lokacije ako nije postavljeno
                    </p>
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Primarna boja</label>
                    <div className="space-y-3">
                      <div
                        className="aspect-square rounded-2xl border border-border cursor-pointer overflow-hidden relative group"
                        onClick={() => document.getElementById('color-picker')?.click()}
                      >
                        <div
                          className="absolute inset-0"
                          style={{ backgroundColor: form.primaryColor }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-sm font-medium">Promeni</span>
                        </div>
                        <input
                          id="color-picker"
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.primaryColor}
                          onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-sm text-center focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setForm({ name: "", address: "", logo: null, primaryColor: "#ef4444", slug: "" });
                  }}
                  className="px-5 py-2.5 text-foreground-muted hover:text-foreground hover:bg-white/5 rounded-xl transition-all font-medium"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !form.name.trim()}
                  className="px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25 disabled:shadow-none flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Kreiranje...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Kreiraj lokaciju</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Novi administrator</h2>
                  <p className="text-sm text-foreground-muted flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {locations.find(l => l.id === showAddAdminModal)?.name}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddAdmin} className="p-6 space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ime i prezime <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    placeholder="npr. Marko Marković"
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-400 mb-1">Pristupni podaci</p>
                    <p className="text-xs text-foreground-muted">
                      Administrator će dobiti jedinstveni Staff ID i PIN za prijavu. Ove podatke možete proslediti osobi koja će upravljati ovom lokacijom.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAdminModal(null);
                    setAdminForm({ name: "", gymId: "" });
                  }}
                  className="px-5 py-2.5 text-foreground-muted hover:text-foreground hover:bg-white/5 rounded-xl transition-all font-medium"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !adminForm.name.trim()}
                  className="px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25 disabled:shadow-none flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Dodavanje...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Dodaj admina</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Izmeni lokaciju</h2>
                  <p className="text-sm text-foreground-muted">Ažurirajte detalje lokacije</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Naziv lokacije <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="npr. Classic Gym Centar"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Adresa <span className="text-foreground-muted text-xs font-normal">(opciono)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="npr. Bulevar Mihajla Pupina 10"
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  URL slug <span className="text-foreground-muted text-xs font-normal">(opciono)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-muted text-sm">
                    /gym-portal/
                  </div>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => handleEditSlugChange(e.target.value)}
                    placeholder="npr. centar"
                    className={`w-full pl-24 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 transition-all ${
                      editSlugError
                        ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
                        : "border-border focus:border-accent focus:ring-accent/20"
                    }`}
                  />
                </div>
                {editSlugError && (
                  <p className="text-xs text-red-400 mt-1.5">{editSlugError}</p>
                )}
                {editForm.slug && !editSlugError ? (
                  <a
                    href={`/gym-portal/${editForm.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1.5 flex items-center gap-1 hover:underline"
                  >
                    Pogledaj marketing stranicu
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : (
                  <p className="text-xs text-foreground-muted mt-1.5">
                    Jedinstveni URL za marketing stranicu ove lokacije
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-5 py-2.5 text-foreground-muted hover:text-foreground hover:bg-white/5 rounded-xl transition-all font-medium"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editForm.name.trim()}
                  className="px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:bg-accent/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25 disabled:shadow-none flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Čuvanje...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Sačuvaj izmene</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Created Modal (Same Credentials) */}
      {locationCreated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 border-b border-emerald-500/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Lokacija kreirana!</h2>
                  <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {locationCreated.gymName}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Same Credentials Info */}
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl mb-6">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-400 mb-1">Isti pristupni podaci</p>
                    <p className="text-sm text-foreground-muted">
                      {locationCreated.message}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-foreground-muted text-center mb-4">
                Kao vlasnik, možete se prijaviti na ovu lokaciju korišćenjem istog Staff ID-a i PIN-a koji koristite za ostale lokacije.
              </p>

              {/* Action Button */}
              <button
                onClick={() => setLocationCreated(null)}
                className="w-full px-6 py-3.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Razumem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {newCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background-secondary border border-border rounded-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 border-b border-emerald-500/20">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {newCredentials.adminName ? "Admin uspešno dodat!" : "Lokacija kreirana!"}
                  </h2>
                  <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {newCredentials.gymName}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-foreground-muted mb-4">
                {newCredentials.adminName
                  ? `Pristupni podaci za ${newCredentials.adminName}:`
                  : "Sačuvajte ove pristupne podatke:"
                }
              </p>

              {/* Credentials Card */}
              <div className="bg-background rounded-2xl border border-border overflow-hidden">
                {/* Staff ID */}
                <div className="p-4 flex items-center justify-between border-b border-border">
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Staff ID</p>
                    <p className="font-mono text-2xl font-bold text-accent tracking-wide">{newCredentials.staffId}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newCredentials.staffId);
                    }}
                    className="p-3 hover:bg-accent/10 rounded-xl transition-colors group"
                    title="Kopiraj Staff ID"
                  >
                    <svg className="w-5 h-5 text-foreground-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                {/* PIN */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">PIN</p>
                    <p className="font-mono text-2xl font-bold text-accent tracking-[0.5em]">{newCredentials.pin}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newCredentials.pin);
                    }}
                    className="p-3 hover:bg-accent/10 rounded-xl transition-colors group"
                    title="Kopiraj PIN"
                  >
                    <svg className="w-5 h-5 text-foreground-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-400 mb-0.5">Važno obaveštenje</p>
                    <p className="text-xs text-foreground-muted">
                      Ovi podaci se prikazuju samo jednom i ne mogu se ponovo prikazati. Zapišite ih ili ih prosledite odgovornoj osobi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <button
                  onClick={() => setNewCredentials(null)}
                  className="w-full px-6 py-3.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-accent/25 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Razumem, sačuvao/la sam podatke
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
