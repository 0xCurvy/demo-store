output "zone_id" {
  value = cloudflare_zone.shop.id
}

output "name_servers" {
  description = "Point the registrar at these. Not needed when the domain is registered with Cloudflare."
  value       = cloudflare_zone.shop.name_servers
}

output "d1_databases" {
  description = "Orders database per environment."
  value       = { for name, db in cloudflare_d1_database.orders : name => { id = db.id, name = db.name } }
}

output "r2_buckets" {
  description = "Wallpaper bucket per environment. Fill with infra/upload-wallpapers.sh."
  value       = { for name, bucket in cloudflare_r2_bucket.wallpapers : name => bucket.name }
}
