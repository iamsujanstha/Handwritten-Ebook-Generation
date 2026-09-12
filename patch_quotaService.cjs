const fs = require('fs');
let content = fs.readFileSync('src/lib/quotaService.ts', 'utf8');

const replacement = `import { useSettingsStore } from "../store/useSettingsStore";
import { useEffect, useState } from "react";

export function getApiLimits(model: string) {
  if (model.includes("pro")) {
    return { RPM: 2, TPM: 32000, RPD: 50 };
  }
  return { RPM: 15, TPM: 1000000, RPD: 1500 };
}

/**
 * Service hook to fetch and calculate real-time simulated quota metadata.
 * Note: Google AI API does not expose a programmatic endpoint for remaining quota via API key,
 * so this module calculates it locally based on the usage metadata tracked by our app.
 */
export function useQuotaMetadata(model: string = "gemini-3.5-flash") {
  const limits = getApiLimits(model);
  const quotaHistory = useSettingsStore(state => state.quotaHistory);
  const tokenUsage = useSettingsStore(state => state.tokenUsage);
  const [currentUsage, setCurrentUsage] = useState({ rpmUsed: 0, tpmUsed: 0 });

  useEffect(() => {
    // Update every second to decay the sliding window smoothly
    const interval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      const recent = useSettingsStore.getState().quotaHistory.filter(h => h.timestamp > oneMinuteAgo);
      
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

  const rpmRemaining = Math.max(0, limits.RPM - currentUsage.rpmUsed);
  const tpmRemaining = Math.max(0, limits.TPM - currentUsage.tpmUsed);

  return {
    ...currentUsage,
    rpmRemaining,
    tpmRemaining,
    limits,
    totalTokenCount: tokenUsage.totalTokenCount,
    totalHits: tokenUsage.hits
  };
}

export function recordApiUsage(tokenCount: number) {
  useSettingsStore.getState().recordQuotaUsage(tokenCount);
}
`;

fs.writeFileSync('src/lib/quotaService.ts', replacement);
