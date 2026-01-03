"use client";

import { useEffect, useState } from "react";
import { CoachPerformanceDashboard } from "@/components/staff/coach-performance-dashboard";

type TabType = "staff" | "performance";

interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  role: string;
  createdAt: string;
  assignedMembersCount: number;
  pendingRequestsCount: number;
  assignedMembers: Array<{ id: string; name: string }>;
  pendingRequests: Array<{ id: string; name: string }>;
}

interface NewStaffCredentials {
  staffId: string;
  pin: string;
}

export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"coach" | "admin">("coach");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [newCredentials, setNewCredentials] = useState<NewStaffCredentials | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "coach" | "admin">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/staff");
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newName.trim()) {
      setError("Ime je obavezno");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          role: newRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewCredentials(data.credentials);
        fetchStaff();
      } else {
        setError(data.error || "Kreiranje nije uspelo");
      }
    } catch {
      setError("Nije moguće povezivanje. Pokušaj ponovo.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setShowAddModal(false);
    setNewName("");
    setNewRole("coach");
    setNewCredentials(null);
    setError("");
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    coach: "Trener",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-violet-500/20 text-violet-400",
    coach: "bg-blue-500/20 text-blue-400",
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Osoblje
          </h1>
          <p className="text-foreground-muted mt-1">
            Upravljaj trenerima i administratorima
          </p>
        </div>
        {activeTab === "staff" && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Dodaj osoblje
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab("staff")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "staff"
              ? "bg-accent text-white"
              : "bg-background-secondary border border-border text-foreground hover:border-foreground-muted"
          }`}
        >
          Osoblje
        </button>
        <button
          onClick={() => setActiveTab("performance")}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === "performance"
              ? "bg-accent text-white"
              : "bg-background-secondary border border-border text-foreground hover:border-foreground-muted"
          }`}
        >
          Performanse trenera
        </button>
      </div>

      {/* Performance Tab */}
      {activeTab === "performance" && <CoachPerformanceDashboard />}

      {/* Staff Tab */}
      {activeTab === "staff" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <p className="text-sm text-foreground-muted">Ukupno</p>
              <p className="text-2xl font-bold text-foreground">{staff.length}</p>
            </div>
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <p className="text-sm text-foreground-muted">Administratori</p>
              <p className="text-2xl font-bold text-violet-400">
                {staff.filter((s) => s.role.toLowerCase() === "admin").length}
              </p>
            </div>
            <div className="bg-background-secondary border border-border rounded-xl p-4">
              <p className="text-sm text-foreground-muted">Treneri</p>
              <p className="text-2xl font-bold text-blue-400">
                {staff.filter((s) => s.role.toLowerCase() === "coach").length}
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Pretraži osoblje..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value as "all" | "coach" | "admin");
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-background-secondary border border-border rounded-xl text-foreground focus:outline-none focus:border-accent transition-colors"
            >
              <option value="all">Sve uloge</option>
              <option value="coach">Treneri</option>
              <option value="admin">Administratori</option>
            </select>
          </div>

          {/* Staff Table */}
          {(() => {
            // Filter and paginate staff
            const filteredStaff = staff.filter((member) => {
              const matchesSearch = searchQuery === "" ||
                member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.staffId.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesRole = filterRole === "all" || member.role.toLowerCase() === filterRole;
              return matchesSearch && matchesRole;
            });

            const totalPages = Math.ceil(filteredStaff.length / pageSize);
            const startIndex = (currentPage - 1) * pageSize;
            const paginatedStaff = filteredStaff.slice(startIndex, startIndex + pageSize);

            return (
              <>
                <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
                  {filteredStaff.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-foreground-muted">
                        {searchQuery || filterRole !== "all" ? "Nema osoblja koji odgovaraju filterima" : "Još nema osoblja"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-background/50">
                            <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Osoblje</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">Uloga</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden md:table-cell">Staff ID</th>
                            <th className="text-center px-4 py-3 text-sm font-medium text-foreground-muted hidden lg:table-cell">Članovi</th>
                            <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted hidden sm:table-cell">Dodat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStaff.map((member) => (
                            <tr key={member.id} className="border-b border-border/50 hover:bg-background/30 transition-colors">
                              {/* Name with Avatar */}
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    member.role.toLowerCase() === "admin" ? "bg-violet-500/20" : "bg-blue-500/20"
                                  }`}>
                                    <span className={`text-sm font-medium ${
                                      member.role.toLowerCase() === "admin" ? "text-violet-400" : "text-blue-400"
                                    }`}>
                                      {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                    </span>
                                  </div>
                                  <span className="font-medium text-foreground">{member.name}</span>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="px-4 py-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                  roleColors[member.role.toLowerCase()] || "bg-gray-500/20 text-gray-400"
                                }`}>
                                  {roleLabels[member.role.toLowerCase()] || member.role}
                                </span>
                              </td>

                              {/* Staff ID */}
                              <td className="px-4 py-4 hidden md:table-cell">
                                <span className="font-mono text-sm text-foreground-muted">{member.staffId}</span>
                              </td>

                              {/* Assigned Members (coaches only) */}
                              <td className="px-4 py-4 text-center hidden lg:table-cell">
                                {member.role.toLowerCase() === "coach" ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-medium text-foreground">{member.assignedMembersCount}</span>
                                    {member.pendingRequestsCount > 0 && (
                                      <span className="text-xs text-yellow-400">{member.pendingRequestsCount} na čekanju</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-foreground-muted">-</span>
                                )}
                              </td>

                              {/* Created Date */}
                              <td className="px-4 py-4 hidden sm:table-cell">
                                <span className="text-sm text-foreground-muted">
                                  {new Date(member.createdAt).toLocaleDateString("sr-RS")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-foreground-muted">
                      Prikazano {startIndex + 1}-{Math.min(startIndex + pageSize, filteredStaff.length)} od {filteredStaff.length} osoblja
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Prethodna
                      </button>
                      <span className="text-sm text-foreground-muted">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sledeća
                      </button>
                    </div>
                  </div>
                )}

                {/* Results count when not paginating */}
                {totalPages <= 1 && filteredStaff.length > 0 && (
                  <p className="text-sm text-foreground-muted mt-4">
                    Prikazano {filteredStaff.length} od {staff.length} osoblja
                  </p>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md">
            {newCredentials ? (
              // Success state - show credentials
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {newName} je dodat/a!
                  </h2>
                  <p className="text-foreground-muted mt-1">
                    Podeli ove pristupne podatke
                  </p>
                </div>

                <div className="bg-background-secondary border border-border rounded-xl p-4 mb-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-foreground-muted">Staff ID</span>
                      <span className="text-lg font-mono font-bold text-foreground">
                        {newCredentials.staffId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-foreground-muted">PIN</span>
                      <span className="text-lg font-mono font-bold text-foreground">
                        {newCredentials.pin}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                  <p className="text-sm text-yellow-400">
                    PIN se prikazuje samo jednom! Zabeležite ga pre zatvaranja.
                  </p>
                </div>

                <button
                  onClick={resetModal}
                  className="w-full px-4 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
                >
                  Zatvori
                </button>
              </>
            ) : (
              // Add form
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-foreground">Dodaj osoblje</h2>
                  <button
                    onClick={resetModal}
                    className="p-2 text-foreground-muted hover:text-foreground"
                  >
                    X
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      Ime *
                    </label>
                    <input
                      type="text"
                      placeholder="npr. Marko Marković"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      Uloga
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewRole("coach")}
                        className={`py-3 rounded-xl border-2 transition-all text-center ${
                          newRole === "coach"
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-border text-foreground hover:border-foreground-muted"
                        }`}
                      >
                        Trener
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole("admin")}
                        className={`py-3 rounded-xl border-2 transition-all text-center ${
                          newRole === "admin"
                            ? "border-violet-500 bg-violet-500/10 text-violet-400"
                            : "border-border text-foreground hover:border-foreground-muted"
                        }`}
                      >
                        Administrator
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={resetModal}
                    className="flex-1 px-4 py-3 bg-background-secondary border border-border rounded-xl text-foreground hover:border-foreground-muted transition-colors"
                  >
                    Otkaži
                  </button>
                  <button
                    onClick={handleAddStaff}
                    disabled={!newName.trim() || submitting}
                    className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "Dodajem..." : "Dodaj"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
