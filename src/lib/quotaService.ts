import { useSettingsStore } from "../store/useSettingsStore";
import { useEffect, useState } from "react";

// Standard Free Tier Limits for Gemini Flash
export const API_LIMITS = {
  RPM: 15, // Requests per minute
  TPM: 1000000, // Tokens per minute
  RPD: 1500, // Requests per day
};

/**
 * Service hook to fetch and calculate real-time simulated quota metadata.
 * Note: Google AI API does not expose a programmatic endpoint for remaining quota via API key,
 * so this module calculates it locally based on the usage metadata tracked by our app.
 */
export function useQuotaMetadata() {
  const quotaHistory = useSettingsStore(state => state.quotaHistory);
  const tokenUsage = useSettingsStore(state => state.tokenUsage);
  const [currentUsage, setCurrentUsage] = useState({ rpmUsed: 0, tpmUsed: 0 });

  useEffect(() => {
    // Update every second to decay the sliding window smoothly
    const interval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const recent = quotaHistory.filter(h => h.timestamp > oneMinuteAgo);
      
      const rpm = recent.length;
      const tpm = recent.reduce((sum, h) => sum + h.tokens, 0);
      
      setCurrentUsage({ rpmUsed: rpm, tpmUsed: tpm });
    }, 1000);

    // Initial calculation
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recent = quotaHistory.filter(h => h.timestamp > oneMinuteAgo);
    setCurrentUsage({
      rpmUsed: recent.length,
      tpmUsed: recent.reduce((sum, h) => sum + h.tokens, 0)
    });

    return () => clearInterval(interval);
  }, [quotaHistory]);

  const rpmRemaining = Math.max(0, API_LIMITS.RPM - currentUsage.rpmUsed);
  const tpmRemaining = Math.max(0, API_LIMITS.TPM - currentUsage.tpmUsed);

  return {
    ...currentUsage,
    rpmRemaining,
    tpmRemaining,
    limits: API_LIMITS,
    totalTokenCount: tokenUsage.totalTokenCount,
    totalHits: tokenUsage.hits
  };
}

export function recordApiUsage(tokenCount: number) {
  useSettingsStore.getState().recordQuotaUsage(tokenCount);
}
