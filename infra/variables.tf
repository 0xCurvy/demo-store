variable "cloudflare_account_id" {
  description = "The Cloudflare account that owns the zone, the Workers, D1 and R2. Not a secret."
  type        = string
}

variable "zone_name" {
  description = "The shop's domain. Its zone must already be on the account (Cloudflare Registrar adds it; otherwise add the site in the dashboard)."
  type        = string
  default     = "brutalism.store"
}

variable "region_hint" {
  description = "Where D1 and R2 keep the data. weur is Western Europe; see Cloudflare's location hints."
  type        = string
  default     = "weur"
}

variable "environments" {
  description = "One Worker per environment, each with its own D1 database and R2 bucket and its own host on the zone."
  type = map(object({
    host        = string
    git_branch  = string
    cron        = string
    workers_dev = bool
    # The network the environment takes payments on, from the Curvy web app's Payments setup. Public values.
    chain_id           = number
    token_address      = string
    aggregator_address = string
    checkout_url       = string
  }))
  default = {
    production = {
      host               = "brutalism.store"
      git_branch         = "main"
      cron               = "* * * * *"
      workers_dev        = false
      chain_id           = 42161
      token_address      = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
      aggregator_address = "0xe51924cef003a654ec9735c4d97f5d4862cbcbb1"
      checkout_url       = "https://app.curvy.box/checkout"
    }
    development = {
      host               = "dev.brutalism.store"
      git_branch         = "develop"
      cron               = "* * * * *"
      workers_dev        = true
      chain_id           = 42161
      token_address      = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
      aggregator_address = "0xe51924cef003a654ec9735c4d97f5d4862cbcbb1"
      checkout_url       = "https://app.curvy.box/checkout"
    }
  }
}
