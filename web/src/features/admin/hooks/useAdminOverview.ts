import type { AdminOverview } from "@api";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";

const REFRESH_EVERY_MS = 10_000;

export const adminOverviewKey = (token: string | null) => ["admin-overview", token] as const;

/** Settings, totals and recent orders, refreshed every few seconds while the page is open. */
export function useAdminOverview(token: string | null) {
  return useQuery({
    queryKey: adminOverviewKey(token),
    queryFn: () => api.get<AdminOverview>("/api/admin/overview", { token: token ?? undefined }),
    enabled: token !== null,
    refetchInterval: REFRESH_EVERY_MS,
    retry: false,
  });
}
