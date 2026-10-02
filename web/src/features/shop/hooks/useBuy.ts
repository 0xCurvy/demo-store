import type { CreatedOrder } from "@api";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api/client";

/**
 * Creates the order on the shop's server, which signs a one-time payment request, then sends the
 * buyer to Curvy's checkout page. The page stays busy until the browser leaves.
 */
export function useBuy() {
  return useMutation({
    mutationFn: (productId: string) => api.post<CreatedOrder>("/api/orders", { productId }),
    onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
  });
}
