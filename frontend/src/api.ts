import { tokenStore } from "./storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

type ApiOptions = {
  method?: string;
  body?: any;
  auth?: boolean;
};

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.auth !== false) {
    const token = await tokenStore.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.detail || data?.message || res.statusText;
    const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ") : JSON.stringify(detail);
    throw new Error(msg || "So'rov bajarilmadi");
  }
  return data as T;
}
