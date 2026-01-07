"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface GymInfo {
  id: string;
  name: string;
  ownerEmail: string;
  admin: {
    staffId: string;
    pin: string;
  };
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gymId = searchParams.get("gymId");
  const tier = searchParams.get("tier") || "starter";
  const cancelled = searchParams.get("cancelled");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);

  useEffect(() => {
    if (!gymId) {
      router.push("/gym-portal/gym-signup");
      return;
    }

    // Fetch gym info and create checkout session
    const initiateCheckout = async () => {
      try {
        setIsLoading(true);

        // Create checkout session
        const response = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gymId, tier }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Greška pri kreiranju sesije za plaćanje");
        }

        // Store gym info for display
        if (data.gym) {
          setGymInfo(data.gym);
        }

        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nepoznata greška");
        setIsLoading(false);
      }
    };

    // Only initiate checkout if not cancelled
    if (!cancelled) {
      initiateCheckout();
    } else {
      setIsLoading(false);
    }
  }, [gymId, cancelled, router]);

  // If cancelled, show retry option
  if (cancelled) {
    return (
      <div className="py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning/10 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Plaćanje otkazano
          </h1>
          <p className="text-foreground-muted mb-8">
            Plaćanje nije završeno. Vaša teretana je registrovana, ali još nije aktivirana.
            Možete pokušati ponovo.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => {
                // Remove cancelled param and retry
                router.push(`/gym-portal/checkout?gymId=${gymId}&tier=${tier}`);
                window.location.reload();
              }}
              className="w-full py-4 px-6 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
            >
              Pokušaj ponovo
            </button>
            <button
              onClick={() => router.push("/gym-portal")}
              className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 text-foreground font-medium rounded-xl transition-colors"
            >
              Nazad na početnu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Priprema plaćanja...
          </h1>
          <p className="text-foreground-muted">
            Preusmeravamo vas na sigurnu stranicu za plaćanje
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-20">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-error/10 flex items-center justify-center">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Greška
          </h1>
          <p className="text-foreground-muted mb-8">{error}</p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 px-6 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors"
            >
              Pokušaj ponovo
            </button>
            <button
              onClick={() => router.push("/gym-portal/gym-signup")}
              className="w-full py-4 px-6 bg-white/5 hover:bg-white/10 text-foreground font-medium rounded-xl transition-colors"
            >
              Nazad na registraciju
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function LoadingFallback() {
  return (
    <div className="py-20">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Učitavanje...
        </h1>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CheckoutContent />
    </Suspense>
  );
}
