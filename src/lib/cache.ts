export async function generateCacheKey(payload: any) {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return "note_cache_" + hashHex;
}

export const getCachedNote = (key: string) => {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch(e) {}
  }
  return null;
}

export const setCachedNote = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) {
    // Ignore quota errors or handle cache cleanup if needed
  }
}
