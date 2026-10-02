terraform {
  required_version = ">= 1.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.26"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }

  # State lives locally until you uncomment this. R2 speaks S3, so it can hold the state too:
  # create a bucket named `terraform-state` once (by hand or with a separate root), then run
  #   terraform init -backend-config="access_key=…" -backend-config="secret_key=…"
  # with an R2 API token's credentials.
  #
  # backend "s3" {
  #   bucket                      = "terraform-state"
  #   key                         = "brutalism-store.tfstate"
  #   region                      = "auto"
  #   endpoints                   = { s3 = "https://<account id>.r2.cloudflarestorage.com" }
  #   skip_credentials_validation = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  #   skip_s3_checksum            = true
  #   use_path_style              = true
  # }
}

# Reads CLOUDFLARE_API_TOKEN from the environment. Never put the token in a file.
provider "cloudflare" {}
