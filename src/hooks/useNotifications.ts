import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface Notification {
  id: string;
  type?: string;
  title: string;
  message: string;
  isRead: boolean;
  category: "general" | "login_activity";
  clientId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  page: number;
}

export function useNotifications(refetchInterval = 15000) {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationsResponse>("/notifications?limit=20"),
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}