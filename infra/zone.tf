# The zone. If the domain was registered through Cloudflare Registrar the zone already exists:
# import it instead of creating it (see README).
resource "cloudflare_zone" "shop" {
  account = { id = var.cloudflare_account_id }
  name    = var.zone_name
  type    = "full"
}

# Every host on the zone is a Worker custom domain, so TLS is terminated at the edge. These two
# settings make sure nothing is ever served over plain HTTP or old TLS.
resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = cloudflare_zone.shop.id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = cloudflare_zone.shop.id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "automatic_https_rewrites" {
  zone_id    = cloudflare_zone.shop.id
  setting_id = "automatic_https_rewrites"
  value      = "on"
}
