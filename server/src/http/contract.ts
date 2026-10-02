/**
 * The JSON the API sends. The web app imports these types (as `@api`), so both sides stay in step.
 * Token amounts are base-unit decimal strings; the pages format them with the token's decimals.
 */

export type OrderStatus =
  | "processing"
  | "confirming"
  | "paid"
  | "underpaid"
  | "wrong_token"
  | "expired";

export interface TokenView {
  address: string;
  symbol: string;
  decimals: number;
}

export interface ProductView {
  id: string;
  /** Its place in the series of ten. */
  number: number;
  city: string;
  subject: string;
  note: string;
  /** In US dollars, as a decimal string: "1.337". */
  price: string;
  /** The 600 × 400 preview, served from the shop's own origin. */
  thumbnail: string;
}

/** The buyer's one-time link to the 4K file, on a paid order. */
export interface DownloadView {
  url: string;
  expiresAt: string;
  /** Set once the file has been sent in full; the link no longer works. */
  downloadedAt: string | null;
}

/** GET /api/shop. Before the shop is set up it lists what is missing instead. */
export type ShopView =
  | { ready: true; products: ProductView[]; seriesSize: number; chainId: number; token: TokenView }
  | { ready: false; problems: string[] };

/** POST /api/orders */
export interface CreatedOrder {
  orderId: string;
  checkoutUrl: string;
}

export interface AttemptView {
  number: number;
  status: OrderStatus;
  /** The payment reference Curvy checkout names in `#retry=` when the buyer asks for a fresh payment. */
  ephemeralKeyX: string;
  /** When the payment link closes (seconds since epoch). */
  expiry: number;
  txHash: string | null;
  netAmount: string | null;
  minimumNetAmount: string | null;
}

/** GET /api/orders/current: the order in this browser's session. */
export interface OrderView {
  id: string;
  productName: string;
  price: string;
  chainId: number;
  token: TokenView;
  amount: string;
  status: OrderStatus;
  attempts: AttemptView[];
  createdAt: string;
  paidAt: string | null;
  download: DownloadView | null;
}

/** POST /api/orders/current/attempts */
export interface FreshAttempt {
  checkoutUrl: string;
}

export interface AdminAttemptView extends AttemptView {
  createdAt: string;
  checkedAt: string | null;
  lastCheckOk: boolean;
  noteId: string | null;
  confirmations: string | null;
  committed: boolean | null;
  siblingNoteIds: string[];
  fromBlock: string;
  checkoutUrl: string;
}

export interface AdminOrderView extends Omit<OrderView, "attempts" | "download"> {
  fulfilledAt: string | null;
  /** When the buyer finished downloading the file; the link is never shown here. */
  downloadedAt: string | null;
  netReceived: string;
  attempts: AdminAttemptView[];
}

/** GET /api/admin/overview */
export interface AdminOverview {
  settings: {
    chainId: number;
    token: string;
    aggregator: string;
    checkoutUrl: string;
    merchantOrigin: string;
    confirmations: number;
    paidWhen: "shielded" | "committed";
    completePath: string;
    paymentTtlSeconds: number;
    signer: string;
    signerNotAfter: string;
  };
  totals: { orders: number; paid: number; netReceived: string; token: TokenView | null };
  orders: AdminOrderView[];
}

/** POST /api/admin/check-payments */
export interface PaymentCheckRun {
  openOrders: number;
  checked: number;
  expired: number;
  failed: number;
  paid: string[];
  skipped: boolean;
}

/** Every error response. */
export interface ApiError {
  error: string;
  code?: string;
  /** Missing or invalid settings, by environment variable. */
  problems?: string[];
}
