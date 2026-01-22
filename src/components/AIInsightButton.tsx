import { useState } from "react";

interface Props {
  journalEntry: string;
  userStage: string;
}

export default function AIInsightButton({ journalEntry, userStage }: Props) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const generateInsight = async () => {
    if (!journalEntry.trim()) {
      setError("Najpierw napisz coś w dzienniku");
      return;
    }

    setLoading(true);
    setError("");
    setInsight("");

    try {
      const response = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journalEntry: journalEntry.trim(),
          currentStage: userStage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nie udało się wygenerować insight");
      }

      setInsight(data.insight);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-insight-container">
      <button onClick={generateInsight} disabled={loading || !journalEntry.trim()} className="ai-insight-button">
        {loading ? (
          <>
            <span className="spinner"></span>
            <span>Analizuję...</span>
          </>
        ) : (
          <>
            <span className="sparkle">✨</span>
            <span>Uzyskaj AI Insight</span>
          </>
        )}
      </button>

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {insight && (
        <div className="insight-box">
          <div className="insight-header">
            <span className="insight-icon">💜</span>
            <h4>Insight od AI</h4>
          </div>
          <p className="insight-text">{insight}</p>
        </div>
      )}
    </div>
  );
}
