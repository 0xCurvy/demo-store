# Per environment: the orders database and the bucket with the 4K files. The Worker itself and its
# custom domain are deployed by wrangler from the generated wrangler.toml, so code and bindings ship together.

resource "cloudflare_d1_database" "orders" {
  for_each = var.environments

  account_id            = var.cloudflare_account_id
  name                  = "brutalism-store-${each.key}-orders"
  primary_location_hint = var.region_hint
  # The API rejects an update without this field, so it is always set.
  read_replication = { mode = "disabled" }
}

resource "cloudflare_r2_bucket" "wallpapers" {
  for_each = var.environments

  account_id    = var.cloudflare_account_id
  name          = "brutalism-store-${each.key}-wallpapers"
  location      = var.region_hint
  storage_class = "Standard"
}

# wrangler.toml for the Worker, with every environment's bindings filled in from the resources above.
# Committed next to the Worker so CI deploys exactly what Terraform created.
resource "local_file" "wrangler" {
  filename        = "${path.module}/../worker/wrangler.toml"
  file_permission = "0644"

  content = templatefile("${path.module}/wrangler.toml.tftpl", {
    account_id = var.cloudflare_account_id
    zone_name  = var.zone_name
    environments = {
      for name, env in var.environments : name => {
        host               = env.host
        cron               = env.cron
        workers_dev        = env.workers_dev
        chain_id           = env.chain_id
        token_address      = env.token_address
        aggregator_address = env.aggregator_address
        checkout_url       = env.checkout_url
        d1_id              = cloudflare_d1_database.orders[name].id
        d1_name            = cloudflare_d1_database.orders[name].name
        r2_name            = cloudflare_r2_bucket.wallpapers[name].name
      }
    }
  })
}
