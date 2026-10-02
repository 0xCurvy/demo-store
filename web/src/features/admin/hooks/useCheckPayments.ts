import type { PaymentCheckRun } from "@api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { adminOverviewKey } from "./useAdminOverview";

/** Runs the shop's background payment check now, instead of waiting for its next turn. */
export function useCheckPayments(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<PaymentCheckRun>("/api/admin/check-payments", {}, { token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminOverviewKey(token) }),
  });
}
