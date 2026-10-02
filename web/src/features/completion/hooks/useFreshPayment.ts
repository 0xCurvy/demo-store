import type { FreshAttempt } from "@api";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/api/client";

type FreshPayment = {
  /** The attempt the new one replaces; the shop refuses anything but the order's latest. */
  latestEphemeralKeyX: string;
  /** Replace this page in the history, so Back does not return to a spent link. */
  replace?: boolean;
};

/** Asks the shop for a new payment link for the same order, then goes to Curvy checkout. */
export function useFreshPayment() {
  return useMutation({
    mutationFn: ({ latestEphemeralKeyX }: FreshPayment) =>
      api.post<FreshAttempt>("/api/orders/current/attempts", { latestEphemeralKeyX }),
    onSuccess: ({ checkoutUrl }, { replace }) => {
      if (replace) window.location.replace(checkoutUrl);
      else window.location.assign(checkoutUrl);
    },
  });
}
