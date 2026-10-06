-- Agent payments over x402, one row per one-time payTo address. `data` is the SDK's payment record; the
-- status column lets the SDK claim a status move atomically, so one challenge settles once across instances.
CREATE TABLE IF NOT EXISTS agent_payments (
  pay_to TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS agent_payments_status ON agent_payments (status);
