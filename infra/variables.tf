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
    # Which Curvy stack the environment pays through, from that stack's Payments setup. Public values: the
    # receiving keys let people pay the shop, nothing more. chain_id and aggregator_address are the overrides for
    # a staging stack; empty, the SDK uses the Curvy environment's own contracts.
    curvy_environment  = string
    curvy_api_url      = string
    checkout_url       = string
    receiving_keys     = string
    chain_id           = string
    aggregator_address = string
    tokens             = string
  }))
  default = {
    production = {
      host        = "brutalism.store"
      git_branch  = "main"
      cron        = "* * * * *"
      workers_dev = false
      # Curvy production. The receiving keys come from Payments setup at app.curvy.box; fill them in to go live.
      curvy_environment  = "mainnet"
      curvy_api_url      = "https://api.curvy.box"
      checkout_url       = "https://app.curvy.box/checkout"
      receiving_keys     = "01Q1JLFcflKpzdXgiNmbbd6WQtyyNUr6C2hWC1XTJi3KQ-fpcVXFxVYxca1yyURa2b-JG7xIvHO58IM8SltvpCMxgg0S9OArWvJjkNVhwY6Qa-DPA-1exKO85lYSgLvHE1_9fBGB8LqbOQxB06_THBCN3Vta9RxlUwVgvTwoG0iNeQRwYV6_f2YRIF4qMVIN8QPvL6xQZTU4ZjUOUMD6mUCNtlvChNGc4Y1LA4VE2WN4VA2Q_RyTjao6C_wx0mBvIWJnGygwMBGQ"
      chain_id           = "42161"
      tokens             = "USDC"
      aggregator_address = "0xCfFcFD5b1e082b3924CD7dD34A49c99ef080f953"
      tokens             = "USDC"
    }
    development = {
      host        = "dev.brutalism.store"
      git_branch  = "develop"
      cron        = "* * * * *"
      workers_dev = true
      # Curvy staging: its own aggregator on Arbitrum One and the checkout at app.curvy.dev, paying the account
      # brutalism.staging-curvy.name (from that stack's Payments setup).
      curvy_environment  = "mainnet"
      curvy_api_url      = "https://api.curvy.dev"
      checkout_url       = "https://app.curvy.dev/checkout"
      receiving_keys     = "01Q1JL5zpy8ahBJBPsR44r-x-L5woOjJrC_uUM6gOplEIAzrEcdEidhpmDLBwMwdnfFqyuv9-7u8Am-8fjaNE9ciD4Li4fTipAGT3_Ia3HekjJublxYo6DT-J3sFO3rZ4x0wDYEeY3RMGKqiW1raysrxXL3swj6yyCUk5c57HRTOexz_oY82Nl57Rqmm8czsovbuxlxQLNn4u1R7ban_DF4BghFCsn9nT-QuFo-mkOBwvbXvdR5taKNQwr66ns2KxC35isNMilsQ"
      chain_id           = "42161"
      aggregator_address = "0xCfFcFD5b1e082b3924CD7dD34A49c99ef080f953"
      tokens             = "USDC"
    }
  }
}
