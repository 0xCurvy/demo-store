variable "cloudflare_account_id" {
  description = "The Cloudflare account that owns the zone, the Workers, D1 and R2. Not a secret."
  type        = string
}

variable "zone_name" {
  description = "The shop's domain. The zone is created here; the registrar's name servers must then point at it."
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
  }))
  default = {
    production = {
      host        = "brutalism.store"
      git_branch  = "main"
      cron        = "* * * * *"
      workers_dev = false
    }
    development = {
      host        = "dev.brutalism.store"
      git_branch  = "develop"
      cron        = "* * * * *"
      workers_dev = true
    }
  }
}
