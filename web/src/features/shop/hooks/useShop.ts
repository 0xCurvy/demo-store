import type { ShopView } from "@api";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";

/** What the shop sells and on which network, or what its setup is missing. */
export function useShop() {
  return useQuery({
    queryKey: ["shop"],
    queryFn: () => api.get<ShopView>("/api/shop"),
  });
}
