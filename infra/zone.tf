# The zone is added to the account by hand, or exists already when the domain is registered through Cloudflare
# Registrar; creating zones needs an account permission most tokens do not carry. Terraform looks it up and manages
# its settings.
data "cloudflare_zone" "shop" {
  filter = {
    name    = var.zone_name
    account = { id = var.cloudflare_account_id }
  }
}

# Every host on the zone is a Worker custom domain, so TLS is terminated at the edge. These settings make sure
# nothing is ever served over plain HTTP or old TLS.
resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = data.cloudflare_zone.shop.id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = data.cloudflare_zone.shop.id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "automatic_https_rewrites" {
  zone_id    = data.cloudflare_zone.shop.id
  setting_id = "automatic_https_rewrites"
  value      = "on"
}
