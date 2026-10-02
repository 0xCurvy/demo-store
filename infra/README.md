# Infrastructure

Everything the shop needs on Cloudflare, as Terraform, for two environments:

| Environment | Branch    | Host                  | Orders database (D1)                 | Wallpapers (R2)                          |
| ----------- | --------- | --------------------- | ------------------------------------ | ---------------------------------------- |
| production  | `main`    | `brutalism.store`     | `brutalism-store-production-orders`  | `brutalism-store-production-wallpapers`  |
| development | `develop` | `dev.brutalism.store` | `brutalism-store-development-orders` | `brutalism-store-development-wallpapers` |

Terraform owns the zone's TLS settings and each environment's D1 database and R2 bucket. The zone itself must
already be on the account: Cloudflare Registrar adds it when the domain is registered there, otherwise add the
site in the dashboard first (creating zones needs an account permission most API tokens do not carry). It also writes
`worker/wrangler.toml` from those resources, so the Worker's bindings can never drift from what exists. The Worker
itself, its custom domain and its cron trigger are deployed by `wrangler` from that file, from the GitHub Actions
workflow in `.github/workflows/deploy.yml`, so code and bindings ship together.

## First time

You need Terraform 1.9 or newer, and a Cloudflare API token with these permissions: on the zone, Zone (Read),
Zone Settings (Edit) and DNS (Edit); on the account, Workers Scripts (Edit), D1 (Edit) and Workers R2 Storage (Edit).

```sh
cd infra
cp terraform.tfvars.example terraform.tfvars    # put your account id in
export CLOUDFLARE_API_TOKEN=…                    # never in a file
terraform init
terraform apply
```

If the domain was registered elsewhere, point its registrar at the `name_servers` output.

`terraform apply` writes `worker/wrangler.toml`. Commit it.

## The files the shop sells

The 4K PNGs are not in the repository. Put them in `wallpapers/` (see `wallpapers/README.md`) and upload them to each
environment's bucket:

```sh
export CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=…
infra/upload-wallpapers.sh development
infra/upload-wallpapers.sh production
```

## Deploy secrets

The deploy workflow reads them from two GitHub environments, `production` and `development`, so each environment has
its own keys. Seed them once per environment (each command prompts for the value):

```sh
# Shared by both environments (repository secrets)
gh secret set CLOUDFLARE_API_TOKEN --repo 0xCurvy/demo-store
gh secret set CLOUDFLARE_ACCOUNT_ID --repo 0xCurvy/demo-store

# Per environment (repeat with --env development)
gh secret set CURVY_PAYMENTS_PUBLIC_KEY   --repo 0xCurvy/demo-store --env production
gh secret set MERCHANT_INTENT_SIGNING_KEY --repo 0xCurvy/demo-store --env production
gh secret set RPC_URL                     --repo 0xCurvy/demo-store --env production
gh secret set ADMIN_TOKEN                 --repo 0xCurvy/demo-store --env production

# Public values, as environment variables (repeat with --env development)
gh variable set CHAIN_ID           --repo 0xCurvy/demo-store --env production --body 42161
gh variable set TOKEN_ADDRESS      --repo 0xCurvy/demo-store --env production --body 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
gh variable set AGGREGATOR_ADDRESS --repo 0xCurvy/demo-store --env production --body 0xe51924cef003a654ec9735c4d97f5d4862cbcbb1
gh variable set CHECKOUT_URL       --repo 0xCurvy/demo-store --env production --body https://app.curvy.box/checkout
```

The workflow passes them to the Worker as secrets on every deploy, so rotating one is a matter of setting it again
and re-running the workflow. The development environment can point at Ethereum Sepolia instead (chain id 11155111
and the test USDC from `.env.example`).

## Day to day

- Change a setting or add an environment: edit `variables.tf`, `terraform apply`, commit `worker/wrangler.toml`.
- Deploy the shop: push to `develop` or `main`. `.github/workflows/infra.yml` only validates Terraform; applying is
  deliberately manual, from a machine that holds the token.
- Remote state: see the commented `backend "s3"` block in `versions.tf`; R2 can hold it.
