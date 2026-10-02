/**
 * Curvy checkout sends the buyer back to the completion page with one of two fragments:
 *
 *   #txHash=0x…   after the payment was shielded. Only a hint: the server checks it on chain,
 *                 and finds the payment even without it.
 *   #retry=<R>    the buyer asked for a fresh payment. The server makes one only when R names the
 *                 order's latest attempt and the order is unpaid; anything else just shows the order.
 *
 * The fragment is read once and removed, so a reload never repeats it. A hint is kept in session
 * storage until the shop has used it, in case this tab reloads first.
 */
export interface ReturnFragment {
  txHash: string | null;
  retry: string | null;
}

const HINT_KEY = "overprint:tx-hash";
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

let taken: ReturnFragment | undefined;

function readFragment(): ReturnFragment {
  const fragment = window.location.hash.slice(1);
  const params = new URLSearchParams(fragment);
  const txHash = fragment.startsWith("0x") ? fragment : params.get("txHash");

  return { txHash: txHash && TX_HASH.test(txHash) ? txHash : null, retry: params.get("retry") };
}

export function takeReturnFragment(): ReturnFragment {
  if (taken) return taken;

  taken = readFragment();
  window.history.replaceState(null, "", window.location.pathname);

  if (taken.txHash) rememberHint(taken.txHash);

  return taken;
}

function rememberHint(txHash: string): void {
  try {
    sessionStorage.setItem(HINT_KEY, txHash);
  } catch {
    // Storage can be off (private mode); the hint then lives only in memory.
  }
}

export function storedHint(): string | null {
  try {
    return sessionStorage.getItem(HINT_KEY);
  } catch {
    return null;
  }
}

export function forgetHint(): void {
  try {
    sessionStorage.removeItem(HINT_KEY);
  } catch {
    // Nothing to forget.
  }
}
