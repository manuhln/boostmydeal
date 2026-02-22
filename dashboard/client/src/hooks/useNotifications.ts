import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface Notification {
  _id: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export function useNotifications(filters?: { read?: boolean; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.read !== undefined) params.append("read", String(filters.read));
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));

  const queryString = params.toString();
  const url = queryString ? `/api/notifications?${queryString}` : "/api/notifications";

  return useQuery<{ data: Notification[]; total: number; page: number; limit: number }>({
    queryKey: ["/api/notifications", filters],
    queryFn: () => apiRequest("GET", url),
    refetchInterval: 30000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: () => apiRequest("GET", "/api/notifications/unread-count"),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });
}
