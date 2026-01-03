"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface CheckinSettings {
  hasSecret: boolean;
  dailyCode: string | null;
  nextRotation: string | null;
  stats: {
    todayCheckins: number;
    totalCheckins: number;
  };
}

export default function CheckinManagePage() {
  const [settings, setSettings] = useState<CheckinSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/gym-checkin");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch check-in settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Generate QR code when daily code is available
  useEffect(() => {
    if (settings?.dailyCode) {
      QRCode.toDataURL(settings.dailyCode, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setQrCodeDataUrl);
    } else {
      setQrCodeDataUrl(null);
    }
  }, [settings?.dailyCode]);

  const handleEnable = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/gym-checkin", {
        method: "POST",
      });
      if (response.ok) {
        await fetchSettings();
      }
    } catch (error) {
      console.error("Failed to enable check-in:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/gym-checkin", {
        method: "POST",
      });
      if (response.ok) {
        await fetchSettings();
      }
    } catch (error) {
      console.error("Failed to regenerate check-in:", error);
    } finally {
      setActionLoading(false);
      setShowRegenerateModal(false);
    }
  };

  const handleDisable = async () => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/admin/gym-checkin", {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchSettings();
      }
    } catch (error) {
      console.error("Failed to disable check-in:", error);
    } finally {
      setActionLoading(false);
      setShowDisableModal(false);
    }
  };

  const handleCopyCode = async () => {
    if (settings?.dailyCode) {
      await navigator.clipboard.writeText(settings.dailyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement("a");
      link.download = "qr-prijava-teretana.png";
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            QR Prijava u Teretanu
          </h1>
          <p className="text-foreground-muted mt-1">
            Upravljajte QR kodom za verifikaciju treninga tokom izazova
          </p>
        </div>
        {settings?.hasSecret && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowRegenerateModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-background-secondary border border-border text-foreground rounded-xl font-medium hover:border-accent/30 transition-colors disabled:opacity-50"
            >
              Regeneriši
            </button>
            <button
              onClick={() => setShowDisableModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              Deaktiviraj
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!settings?.hasSecret && (
        <div className="bg-background-secondary border border-border rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            QR prijava nije aktivirana
          </h2>
          <p className="text-foreground-muted max-w-md mx-auto mb-8">
            Aktivirajte QR prijavu za verifikaciju treninga tokom izazova.
            Članovi će morati da skeniraju QR kod u teretani pre nego što unesu trening.
          </p>
          <button
            onClick={handleEnable}
            disabled={actionLoading}
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {actionLoading ? "Aktiviram..." : "Aktiviraj QR Prijavu"}
          </button>
        </div>
      )}

      {/* Active State */}
      {settings?.hasSecret && (
        <>
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            <div className="bg-background-secondary border border-border rounded-2xl p-6">
              <p className="text-sm text-foreground-muted mb-2">Prijave danas</p>
              <p className="text-3xl font-bold text-foreground">{settings.stats.todayCheckins}</p>
            </div>
            <div className="bg-background-secondary border border-border rounded-2xl p-6">
              <p className="text-sm text-foreground-muted mb-2">Ukupno prijava</p>
              <p className="text-3xl font-bold text-foreground">{settings.stats.totalCheckins}</p>
            </div>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* QR Code Section */}
            <div className="bg-background-secondary border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">QR Kod</h3>

              {qrCodeDataUrl && (
                <div className="flex flex-col items-center">
                  <div className="bg-white rounded-xl p-4 mb-4">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR kod za prijavu"
                      className="w-64 h-64"
                    />
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={handleDownloadQR}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Preuzmi QR
                    </button>
                    <button
                      onClick={handleCopyCode}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-background border border-border text-foreground rounded-xl font-medium hover:border-accent/30 transition-colors"
                    >
                      {copied ? (
                        <>
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Kopirano!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Kopiraj kod
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Section */}
            <div className="bg-background-secondary border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Status</h3>

              <div className="flex items-center gap-3 mb-4">
                <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-emerald-400 font-medium">Aktivirano</span>
              </div>

              {/* Daily code info */}
              <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-cyan-400 font-medium">Dnevni kod</span>
                </div>
                <p className="text-sm text-foreground-muted mb-2">
                  Današnji kod: <span className="font-mono font-bold text-foreground">{settings?.dailyCode}</span>
                </p>
                <p className="text-xs text-foreground-muted">
                  Sledeća promena za: <span className="font-medium text-cyan-400">{settings?.nextRotation}</span>
                </p>
              </div>

              <div className="space-y-4 text-foreground-muted">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Kod se automatski menja svakog dana u ponoć (UTC)</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Članovi moraju da skeniraju QR kod u teretani za bodove treninga</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Prikažite QR kod na ekranu u teretani - ažuriraće se automatski</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-sm text-yellow-400">
                  <strong>Napomena:</strong> Regenerisanje kreira potpuno novi sistem kodova.
                  Koristite samo ako sumnjate da je kod kompromitovan.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-foreground mb-4">Regeneriši QR kod?</h3>
            <p className="text-foreground-muted mb-6">
              Ovo će poništiti stari QR kod. Članovi sa starim kodom neće moći da se prijave dok ne skeniraju novi.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border text-foreground rounded-xl font-medium hover:border-accent/30 transition-colors disabled:opacity-50"
              >
                Otkaži
              </button>
              <button
                onClick={handleRegenerate}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Regenerišem..." : "Regeneriši"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-foreground mb-4">Deaktiviraj QR prijavu?</h3>
            <p className="text-foreground-muted mb-6">
              Članovi više neće morati da skeniraju QR kod za bodove treninga u izazovima.
              Možete ponovo aktivirati u bilo kom trenutku.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisableModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-background-secondary border border-border text-foreground rounded-xl font-medium hover:border-accent/30 transition-colors disabled:opacity-50"
              >
                Otkaži
              </button>
              <button
                onClick={handleDisable}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Deaktiviram..." : "Deaktiviraj"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
