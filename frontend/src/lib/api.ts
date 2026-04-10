export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_KEY = import.meta.env.VITE_API_KEY || "dev-key-12345";

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
};
