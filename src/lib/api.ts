let rawBackend = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:5000" : "https://freelance-client-management-saas.onrender.com");
if (rawBackend.endsWith("/")) rawBackend = rawBackend.slice(0, -1);
export const BACKEND_URL = rawBackend;

let rawBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "/api" : "https://freelance-client-management-saas.onrender.com/api");
if (rawBase.endsWith("/")) rawBase = rawBase.slice(0, -1);
if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && !rawBase.endsWith("/api")) {
  rawBase += "/api";
}
const BASE = rawBase;

export function getToken(): string | null {
  return localStorage.getItem("sbs_token");
}

export function setToken(token: string): void {
  localStorage.setItem("sbs_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("sbs_token");
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export async function apiUpload(file: File, amount?: string): Promise<{ url: string; filename: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (amount) headers["x-amount"] = amount;

  const res = await fetch(`${BASE}/uploads`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function apiUploadChat(file: File): Promise<{ url: string; filename: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/uploads/chat`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error("Chat upload failed");
  return res.json();
}

export async function apiUploadProfile(file: File): Promise<{ url: string; filename: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/uploads/profile`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error("Profile photo upload failed");
  return res.json();
}

export async function apiUploadNotes(file: File): Promise<{ url: string; filename: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/uploads/notes`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error("Notes upload failed");
  return res.json();
}

export async function apiUploadLogo(file: File): Promise<{ url: string; filename: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/uploads/logo`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) throw new Error("Logo upload failed");
  return res.json();
}