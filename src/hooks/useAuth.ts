import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, setToken, clearToken, getToken } from "@/lib/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "client";
  company?: string;
  phone?: string;
  clientId?: string;
  photoUrl?: string;
}

export function useAuthUser() {
  return useQuery<AuthUser>({
    queryKey: ["auth-user"],
    queryFn: () => apiFetch<AuthUser>("/auth/me"),
    enabled: !!getToken(),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation<any, Error, any, any>({
    mutationFn: async (creds: any) => {
      const data = await apiFetch<{ user: AuthUser; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(creds),
      });
      setToken(data.token);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      clearToken();
      qc.clear();
    },
  });
}