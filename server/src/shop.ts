/** Puts the shop together: storage, the chain and the SDK, the order flows and the background job. */
import type { ShopSettings, SignerSettings } from "./config/settings.js";
import type { Log } from "./log.js";
import { fulfilOrder } from "./orders/fulfilment.js";
import { createOrderService, type OrderService } from "./orders/order-service.js";
import { createPaymentChecker } from "./orders/payment-checker.js";
import { createReconciler, type Reconciler } from "./orders/reconciler.js";
import { createCurvyPayments } from "./payments/curvy-payments.js";
import { createNetwork, type Network } from "./payments/network.js";
import type { Payments } from "./payments/payments.js";
import type { OrderRepository } from "./storage/order-repository.js";
import {
  type AgentMerchant,
  type AgentPayments,
  createAgentPayments,
} from "./x402/agent-payments.js";
import { JsonFileX402Store } from "./x402/json-file-store.js";
import type { X402MerchantConfig, X402PaymentStore } from "@0xcurvy/payments-sdk/x402/merchant";

export interface Shop {
  settings: ShopSettings;
  signer: SignerSettings;
  repository: OrderRepository;
  payments: Payments;
  network: Network;
  orders: OrderService;
  reconciler: Reconciler;
  /** Payments from agents over x402. */
  agents: AgentPayments;
}

export interface ShopDeps {
  settings: ShopSettings;
  signer: SignerSettings;
  repository: OrderRepository;
  log: Log;
  /** Tests pass a fake; by default the real chain and the Curvy Payments SDK. */
  payments?: Payments;
  /** Where agent payments live; in memory unless given. */
  agentStore?: X402PaymentStore;
  /** Tests pass a fake x402 merchant. */
  createMerchant?: (config: X402MerchantConfig) => Promise<AgentMerchant>;
  now?: () => number;
}

export function createShop(deps: ShopDeps): Shop {
  const { settings, signer, repository, log, now } = deps;
  const payments = deps.payments ?? createCurvyPayments(settings);
  const network = createNetwork(payments, settings.chainId);
  const onPaid = (order: Parameters<typeof fulfilOrder>[0]) => fulfilOrder(order, log);

  const checker = createPaymentChecker({
    repository,
    payments,
    confirmations: settings.confirmations,
    onPaid,
    now,
  });

  const orders = createOrderService({
    settings,
    repository,
    payments,
    network,
    checker,
    onPaid,
    log,
    now,
  });

  const agents = createAgentPayments({
    settings,
    store: deps.agentStore ?? new JsonFileX402Store(),
    log,
    ...(deps.createMerchant ? { createMerchant: deps.createMerchant } : {}),
  });

  const reconciler = createReconciler({ repository, payments, checker, agents, log, now });

  return { settings, signer, repository, payments, network, orders, reconciler, agents };
}
