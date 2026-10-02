# Brutalism: a Curvy checkout demo

Brutalism sells five 4K wallpapers of Yugoslav brutalist architecture and takes payments with [Curvy checkout](https://docs.curvy.box/sdk/payments/human-checkout). A buyer sees a thumbnail, pays from their own wallet on Curvy's checkout page, and comes back to the shop, which confirms the payment on chain before it counts the order as paid. The paid order gets a download link to the full file that works once. The money arrives privately in the shop owner's Curvy account.

It is a complete, working shop: an Express backend built on [`@0xcurvy/payments-sdk`](https://www.npmjs.com/package/@0xcurvy/payments-sdk) and a React frontend. Copy it as the starting point for your own integration.

## What you need

- Node.js 22.16 or newer.
- pnpm. Any installed version switches to the pnpm 11 release named in `package.json`.
- A Curvy account with **Payments** turned on in the Curvy web app. Its Payments setup gives you your public key for payments and the network values.
- An RPC endpoint for the network you use (Ethereum Sepolia for test money).

## Run it

```sh
pnpm install
cp .env.example .env
pnpm create-signer
pnpm dev
```

Then open <http://localhost:3100>.

pnpm installs only package versions that have been public for at least a day, so a hijacked release has time to be caught first. `@0xcurvy/payments-sdk` is exempt, so a new SDK release can be used right away. Both rules are in `pnpm-workspace.yaml`.

`pnpm create-signer` makes the key that signs your checkout requests. It prints the signer's public address and writes the private key to `checkout-signer.secret.json`. Put that key in `.env` as `MERCHANT_INTENT_SIGNING_KEY` and delete the file.

The server starts even while `.env` is incomplete: the shop page lists what is still missing, so you can fill it in one value at a time, in the order the web app's Payments setup asks for them:

1. **Website.** Set `MERCHANT_INTENT_SIGNING_KEY` and `MERCHANT_ORIGIN`. The shop now serves its signer list at `/.well-known/curvy-payments.json`, which the setup checks. The list also gives the shop's name and the icon checkout shows for it (`CHECKOUT_NAME` and `web/public/curvy-icon.png`, set in `server/src/payments/signer-list.ts`); checkout shows the shop's address beside the name. Replace them with your own name and a square PNG or WebP.
2. **Backend.** Copy the `.env` block from the setup: `CURVY_PAYMENTS_PUBLIC_KEY`, `CHAIN_ID`, `TOKEN_ADDRESS`, `AGGREGATOR_ADDRESS`, `CHECKOUT_URL`. Add your `RPC_URL` and restart.
3. **Test payment.** Buy something in the shop and pay it on Curvy checkout.

Set `ADMIN_TOKEN` to see every order and payment attempt at <http://localhost:3100/admin>.

## How a purchase works

1. **The shop creates the order.** `POST /api/orders` makes a one-time payment request with the SDK, signs it with the checkout signer, stores it, and returns Curvy's checkout URL with the signed request in its fragment. The request carries a short `description` of the product ("Blue hour · An A5 art print in blue and pink"), signed with the rest, so checkout and its receipt show what is being bought and nobody can change it.
2. **The buyer pays on Curvy checkout.** Checkout reads the shop's signer list, checks the signature, and takes the payment from the buyer's wallet. Curvy screens it and delivers it to the shop's account.
3. **The buyer comes back.** Checkout returns to `/checkout/complete#txHash=…`. The page sends the transaction hash to the shop as a hint and shows the order until it settles.
4. **The shop confirms it on chain.** Only the SDK's `verifyPayment`, run against the stored request, decides that an order is paid. A background job checks every open order every 30 seconds, so orders complete even when the buyer closes the tab.
5. **The buyer downloads the file.** The write that marks the order paid also issues a random download token. `GET /download/<token>` streams the 4K file from `WALLPAPERS_DIR` and marks the link used once the whole file has been sent, so a download that breaks off can be retried.

If Curvy cannot take a payment, or the link expires, checkout sends the buyer back with `#retry=…` and the shop starts a fresh payment attempt for the same order.

## Where things are

```
server/src/
  main.ts                  starts the server: settings, storage, pages, background job
  shop.ts                  puts the shop together
  config/settings.ts       every environment variable, validated in one place
  catalog/products.ts      the wallpapers: thumbnail, 4K file name, caption and price
  orders/
    order-service.ts       creating orders, fresh attempts, the return-link hint
    payment-checker.ts     one verifyPayment check, applied to an attempt
    reconciler.ts          the background job that checks open orders
    attempt.ts             reading and updating one payment attempt
    order-status.ts        the order's status, and when it counts as paid
    fulfilment.ts          the one place an order is fulfilled
    download.ts            the one-time download link a paid order gets
  payments/
    curvy-payments.ts      the Payments SDK and the chain, behind one interface
    signer-list.ts         the /.well-known/curvy-payments.json document and checkout icon
  storage/                 orders in a JSON file, behind a repository interface
  http/
    routes/                one file per group of API routes, download.ts serves the file
    rate-limits.ts         per-visitor limits on orders, payment checks and the API
    contract.ts            the API's response types, shared with the web app

web/src/
  pages/                   one component per page: shop, completion, admin
  features/
    shop/                  product cards and the buy button
    completion/            the page Curvy checkout returns to
    admin/                 the order list
  shared/                  API client, formatting, and the shop's UI pieces
```

## Settings

`.env.example` explains every value. The ones that matter most:

| Variable                                          | What it is                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `CURVY_PAYMENTS_PUBLIC_KEY`                       | Your public key for payments, from Payments setup. It lets people pay you; it cannot spend your funds. |
| `MERCHANT_INTENT_SIGNING_KEY`                     | Secret. Signs checkout requests. Anyone holding it can redirect future payments.                       |
| `CHAIN_ID`, `TOKEN_ADDRESS`, `AGGREGATOR_ADDRESS` | The network and token, from Payments setup.                                                            |
| `CHECKOUT_URL`                                    | Curvy's checkout page.                                                                                 |
| `MERCHANT_ORIGIN`                                 | This shop's own origin. Must be exactly where the shop is served.                                      |
| `RPC_URL`                                         | Your RPC endpoint. It stays on the server.                                                             |
| `CONFIRMATIONS`, `PAID_WHEN`                      | When an order counts as paid.                                                                          |
| `ADMIN_TOKEN`                                     | Opens the admin page.                                                                                  |
| `WALLPAPERS_DIR`                                  | The folder with the 4K files (default `wallpapers`). They are not in the repository.                   |
| `CLIENT_IP_HEADER`                                | Behind a proxy, the header it puts the visitor's address in (`X-Real-IP` on Railway).                  |

## Going to production

```sh
pnpm run build
pnpm start
```

`pnpm start` serves the built pages, the API and the signer list from one process on `PORT`. Before real money:

- Serve the shop over https, and set `MERCHANT_ORIGIN` to that origin.
- Keep `MERCHANT_INTENT_SIGNING_KEY` in a secret store, never in the repository.
- Replace the JSON file store with your database. `storage/order-repository.ts` is the interface to implement.
- Ship goods in `orders/fulfilment.ts`. It runs exactly once per order.
- Use your own RPC endpoint with archive access for older blocks.
- Behind a proxy, set `CLIENT_IP_HEADER`, so rate limits count each visitor rather than the proxy.

The shop limits each visitor address: 10 new payments per 10 minutes, 30 payment checks and 120 API calls a minute. It keeps at most `MAX_OPEN_ORDERS` unpaid orders open, and one order at most 10 payment attempts. The counts live in memory, so run one server process, or give `express-rate-limit` a shared store in `http/rate-limits.ts`.

## Checks

```sh
pnpm test        # server and web tests
pnpm run check   # types, lint, formatting and tests
```

The server tests create and sign real payment requests with the SDK; only the chain is faked.
