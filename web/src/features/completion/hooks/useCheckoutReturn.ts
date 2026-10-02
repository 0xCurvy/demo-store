/**
 * The completion page's state. It hands checkout's transaction hash to the shop, then asks the
 * shop about the order every few seconds until the order settles. For `#retry` it starts a fresh
 * payment at once, when the shop allows one.
 */
import type { OrderView } from "@api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ApiRequestError, api } from "@/shared/api/client";
import { isSettled } from "@/shared/lib/status";
import { canPayAgain } from "../utils/completion-screen";
import { forgetHint, storedHint, takeReturnFragment } from "../utils/return-fragment";
import { sendHint } from "../utils/tx-hash-hint";
import { useFreshPayment } from "./useFreshPayment";

const CHECK_EVERY_MS = 2_500;
/** After this many tries a pending hint is dropped; the shop's own scan still finds the payment. */
const MAX_HINT_TRIES = 30;

/** There is no order in this browser: nothing to wait for. */
export function isNoOrder(error: unknown): boolean {
  return error instanceof ApiRequestError && (error.status === 401 || error.status === 404);
}

export function useCheckoutReturn() {
  const [fragment] = useState(takeReturnFragment);
  const hint = useRef(fragment.txHash ?? storedHint());
  const hintTries = useRef(0);
  const retryChecked = useRef(false);
  const [hintProblem, setHintProblem] = useState<string | null>(null);
  const freshPayment = useFreshPayment();

  const order = useQuery({
    queryKey: ["current-order"],
    queryFn: async () => {
      if (hint.current) {
        hintTries.current += 1;

        const result = await sendHint(hint.current);

        if (result.kind === "rejected") {
          setHintProblem(result.reason);
        }

        if (result.kind !== "pending" || hintTries.current >= MAX_HINT_TRIES) {
          hint.current = null;
          forgetHint();
        }
      }

      return api.get<OrderView>("/api/orders/current?refresh=1");
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      return status && isSettled(status) ? false : CHECK_EVERY_MS;
    },
    retry: (failures, error) => !isNoOrder(error) && failures < 3,
  });

  const { mutate: startFreshPayment } = freshPayment;

  // #retry: a fresh payment only for an unpaid order whose latest attempt checkout named.
  useEffect(() => {
    if (!fragment.retry || !order.data || retryChecked.current) return;

    retryChecked.current = true;

    const latest = order.data.attempts.at(-1);

    if (canPayAgain(order.data) && latest?.ephemeralKeyX === fragment.retry) {
      startFreshPayment({ latestEphemeralKeyX: fragment.retry, replace: true });
    }
  }, [fragment.retry, order.data, startFreshPayment]);

  const retrying = freshPayment.isPending || freshPayment.isSuccess;

  // Until the order arrives, a `#retry` return has not been decided yet.
  const waitingForRetryCheck =
    fragment.retry !== null && order.data === undefined && !order.isError;

  return { order, hintProblem, freshPayment, retrying: retrying || waitingForRetryCheck };
}
