/**
 * Safe JSON fetch utility that prevents SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
 * when an API request returns an HTML error page (e.g. 404, 502, reverse-proxy timeout, or Vite fallback).
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { retries?: number; delayMs?: number }
): Promise<T> {
  const retries = options?.retries ?? 1;
  const delayMs = options?.delayMs ?? 1000;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init);
      const contentType = response.headers.get("content-type") || "";

      // If response is not ok, extract error details safely
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status} (${response.statusText})`;
        if (contentType.includes("application/json")) {
          try {
            const errJson = await response.json();
            errorMessage = errJson.error || errJson.message || errorMessage;
          } catch {
            // Ignore json parse error on error responses
          }
        } else {
          const text = await response.text();
          if (text.includes("<!doctype html>") || text.includes("<html")) {
            errorMessage = `Server is currently processing or restarting (${response.status}). Please try again.`;
          }
        }
        throw new Error(errorMessage);
      }

      // Check if response is HTML instead of JSON
      if (!contentType.includes("application/json")) {
        const text = await response.text();
        if (text.includes("<!doctype html>") || text.includes("<html")) {
          throw new Error("Received an unexpected HTML response from server. Please verify the endpoint or try again.");
        }
        // If it looks like JSON even without proper header, attempt parse
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new Error("Server returned non-JSON data: " + text.slice(0, 80));
        }
      }

      return (await response.json()) as T;
    } catch (err: any) {
      lastError = err;
      // Only retry on network failures or temporary server error codes
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}
