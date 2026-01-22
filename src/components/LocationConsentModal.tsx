import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface LocationConsentModalProps {
  userId: string;
  onConsentChange: (consented: boolean) => void;
}

export default function LocationConsentModal({ userId, onConsentChange }: LocationConsentModalProps) {
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has already made a decision about location sharing
    checkLocationConsent();
  }, [userId]);

  async function checkLocationConsent() {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("location_share_enabled, location_lat, location_lon")
        .eq("id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows returned, which is fine
        console.error("Error checking location consent:", fetchError);
        return;
      }

      // Show modal only if user hasn't made a decision yet
      // (location_share_enabled is null/undefined, not explicitly false)
      if (data && data.location_share_enabled === null && !data.location_lat && !data.location_lon) {
        setShow(true);
      }
    } catch (err) {
      console.error("Error checking location consent:", err);
    }
  }

  async function handleConsent(consented: boolean) {
    setIsLoading(true);
    setError(null);

    try {
      if (consented) {
        // Request geolocation
        if (!navigator.geolocation) {
          setError("Twoja przeglądarka nie obsługuje geolokalizacji.");
          setIsLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Update profile with location and consent
            const { error: updateError } = await supabase
              .from("profiles")
              .upsert(
                {
                  id: userId,
                  location_lat: latitude,
                  location_lon: longitude,
                  location_share_enabled: true,
                },
                {
                  onConflict: "id",
                }
              );

            if (updateError) {
              setError("Błąd podczas zapisywania lokalizacji: " + updateError.message);
              setIsLoading(false);
            } else {
              setShow(false);
              onConsentChange(true);
              // Reload page to update markers
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }
          },
          (err) => {
            setError("Nie udało się uzyskać lokalizacji. Sprawdź ustawienia przeglądarki.");
            console.error("Geolocation error:", err);
            setIsLoading(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          }
        );
      } else {
        // User declined - just set the flag
        const { error: updateError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              location_share_enabled: false,
            },
            {
              onConflict: "id",
            }
          );

        if (updateError) {
          setError("Błąd podczas zapisywania ustawień: " + updateError.message);
          setIsLoading(false);
        } else {
          setShow(false);
          onConsentChange(false);
        }
      }
    } catch (err) {
      setError("Wystąpił nieoczekiwany błąd.");
      console.error("Error handling consent:", err);
      setIsLoading(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a3a] border border-indigo-500/30 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🌍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Udostępnianie Lokalizacji</h2>
          <p className="text-indigo-200/80 text-sm">
            Czy chcesz udostępnić swoją przybliżoną lokalizację, aby pojawić się na globalnej mapie medytacji?
          </p>
        </div>

        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 mb-6">
          <p className="text-indigo-200 text-xs leading-relaxed">
            <strong className="text-white">Twoja prywatność jest ważna:</strong>
            <br />
            • Używamy tylko przybliżonej lokalizacji (nie dokładnego adresu)
            <br />
            • Lokalizacja jest widoczna tylko dla innych uczestników medytacji
            <br />
            • Możesz zmienić to ustawienie w dowolnym momencie w profilu
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleConsent(false)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Nie teraz
          </button>
          <button
            onClick={() => handleConsent(true)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Zapisywanie..." : "Tak, udostępnij ✨"}
          </button>
        </div>
      </div>
    </div>
  );
}

