#!/usr/bin/env bash
# Seeds the GitHub repository secrets, variables and environments the deploy workflow needs. Run it once from the
# repository root, then whenever a value changes. It reads every value from local files and the environment and
# never prints one:
#   CLOUDFLARE_API_TOKEN            from the environment (direnv loads infra/.envrc)
#   CLOUDFLARE_ACCOUNT_ID           from worker/wrangler.toml, as Terraform wrote it
#   CURVY_PAYMENTS_PUBLIC_KEY, MERCHANT_INTENT_SIGNING_KEY, RPC_URL, ADMIN_TOKEN
#                                   from .env (the same values the Node server uses)
# The network values (chain, token, aggregator, checkout URL) are public and come from Terraform via wrangler.toml.
# Production gets the .env values. Development gets the same, except its own freshly generated signing key, so a
# leak of one environment's key never touches the other. Pass --dev-env-file <file> to give development its own
# values instead (for example Sepolia test money).
set -euo pipefail

repo="0xCurvy/demo-store"
root="$(cd "$(dirname "$0")/.." && pwd)"
dev_env_file=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dev-env-file) dev_env_file="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

value() { # value <file> <NAME>
  grep -E "^$2=" "$1" | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'
}

require() { # require <NAME> <value>
  if [ -z "$2" ]; then
    echo "$1 is missing: fill it in $root/.env first" >&2
    exit 1
  fi
}

: "${CLOUDFLARE_API_TOKEN:?export CLOUDFLARE_API_TOKEN first (direnv loads infra/.envrc)}"
account_id="$(grep -oE '^account_id = "[0-9a-f]{32}"' "$root/worker/wrangler.toml" | grep -oE '[0-9a-f]{32}')"
require CLOUDFLARE_ACCOUNT_ID "$account_id"

echo "Repository secrets"
gh secret set CLOUDFLARE_API_TOKEN --repo "$repo" --body "$CLOUDFLARE_API_TOKEN"
gh secret set CLOUDFLARE_ACCOUNT_ID --repo "$repo" --body "$account_id"

seed_environment() { # seed_environment <environment> <env file> <signing key>
  local environment="$1" file="$2" signing_key="$3"
  local public_key rpc_url admin_token

  public_key="$(value "$file" CURVY_PAYMENTS_PUBLIC_KEY)"
  rpc_url="$(value "$file" RPC_URL)"
  admin_token="$(value "$file" ADMIN_TOKEN)"

  for pair in "CURVY_PAYMENTS_PUBLIC_KEY=$public_key" "RPC_URL=$rpc_url" "ADMIN_TOKEN=$admin_token" \
    "MERCHANT_INTENT_SIGNING_KEY=$signing_key"; do
    require "${pair%%=*}" "${pair#*=}"
  done

  echo "Environment $environment"
  gh api -X PUT "repos/$repo/environments/$environment" >/dev/null

  gh secret set CURVY_PAYMENTS_PUBLIC_KEY --repo "$repo" --env "$environment" --body "$public_key"
  gh secret set MERCHANT_INTENT_SIGNING_KEY --repo "$repo" --env "$environment" --body "$signing_key"
  gh secret set RPC_URL --repo "$repo" --env "$environment" --body "$rpc_url"
  gh secret set ADMIN_TOKEN --repo "$repo" --env "$environment" --body "$admin_token"
}

production_key="$(value "$root/.env" MERCHANT_INTENT_SIGNING_KEY)"
seed_environment production "$root/.env" "$production_key"

# Development: its own signing key, generated here and kept nowhere but GitHub.
dev_signer="$(mktemp)"
(cd "$root/server" && pnpm exec curvy-payments create-signer --out "$dev_signer" >/dev/null)
development_key="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["privateKey"])' "$dev_signer")"
rm -f "$dev_signer"
seed_environment development "${dev_env_file:-$root/.env}" "$development_key"

echo
echo "Done. Deploy with: gh workflow run deploy.yml --repo $repo --ref main   (and --ref develop)"
