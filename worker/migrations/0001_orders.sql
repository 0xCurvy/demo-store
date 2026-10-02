-- One row per order. The order itself is the same JSON the Node server kept in its file; the other
-- columns are what the shop queries by, maintained on every write.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  open INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  download_token TEXT UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_open ON orders (open);
CREATE INDEX IF NOT EXISTS orders_created_at ON orders (created_at DESC);
