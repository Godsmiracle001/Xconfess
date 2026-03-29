#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/xconfess-contracts"
TARGET_DIR="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release"

CONTRACT_CRATES=(
  "confession-anchor"
  "confession-registry"
  "anonymous-tipping"
  "reputation-badges"
)

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

crate_to_wasm_name() {
  local crate="$1"
  echo "${crate//-/_}.wasm"
}

verify_wasm_outputs() {
  local missing=0
  for crate in "${CONTRACT_CRATES[@]}"; do
    local wasm_file
    wasm_file="$(crate_to_wasm_name "$crate")"
    if [[ ! -f "$TARGET_DIR/$wasm_file" ]]; then
      echo "Missing artifact: $TARGET_DIR/$wasm_file" >&2
      missing=1
    fi
  done

  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
}

write_manifest() {
  local output_file="$1"
  local generated_at
  generated_at="$(timestamp_utc)"

  python - "$CONTRACTS_DIR" "$TARGET_DIR" "$output_file" "$generated_at" "${CONTRACT_CRATES[@]}" <<'PY'
import hashlib
import json
import pathlib
import re
import sys

contracts_dir = pathlib.Path(sys.argv[1])
target_dir = pathlib.Path(sys.argv[2])
output_file = pathlib.Path(sys.argv[3])
generated_at = sys.argv[4]
crates = sys.argv[5:]

def crate_version(crate: str) -> str:
    cargo_toml = contracts_dir / "contracts" / crate / "Cargo.toml"
    text = cargo_toml.read_text(encoding="utf-8")
    match = re.search(r'(?m)^version\s*=\s*"([^"]+)"\s*$', text)
    if not match:
        raise RuntimeError(f"No version found in {cargo_toml}")
    return match.group(1)

contracts = {}
for crate in crates:
    wasm_name = crate.replace("-", "_") + ".wasm"
    wasm_path = target_dir / wasm_name
    content = wasm_path.read_bytes()
    contracts[crate] = {
        "wasm_file": str(wasm_path.relative_to(contracts_dir)),
        "version": crate_version(crate),
        "sha256": hashlib.sha256(content).hexdigest(),
        "bytes": len(content),
    }

manifest = {
    "generated_at_utc": generated_at,
    "target": "wasm32-unknown-unknown",
    "profile": "release",
    "contracts": contracts,
}

output_file.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

build_all() {
  require_cmd cargo
  require_cmd rustup
  pushd "$CONTRACTS_DIR" >/dev/null
  rustup target add wasm32-unknown-unknown >/dev/null
  cargo build --locked --workspace --release --target wasm32-unknown-unknown
  popd >/dev/null
  verify_wasm_outputs

  mkdir -p "$REPO_ROOT/deployments"
  local manifest_file="$REPO_ROOT/deployments/contract-wasm-manifest.json"
  write_manifest "$manifest_file"
  echo "Build complete. Manifest: $manifest_file"
}

verify_only() {
  verify_wasm_outputs
  mkdir -p "$REPO_ROOT/deployments"
  local manifest_file="$REPO_ROOT/deployments/contract-wasm-manifest.json"
  write_manifest "$manifest_file"
  echo "Verification complete. Manifest: $manifest_file"
}

deploy_all() {
  local network="$1"
  local source_key="$2"

  require_cmd stellar
  verify_only

  local generated_at
  generated_at="$(timestamp_utc)"
  local ids_file
  ids_file="$(mktemp)"

  for crate in "${CONTRACT_CRATES[@]}"; do
    local wasm_file
    wasm_file="$(crate_to_wasm_name "$crate")"
    local wasm_path="$TARGET_DIR/$wasm_file"
    echo "Deploying $crate ($wasm_file) to $network..."
    local contract_id
    contract_id="$(stellar contract deploy --wasm "$wasm_path" --network "$network" --source "$source_key")"
    echo "$crate=$contract_id" >> "$ids_file"
  done

  local output_file="$REPO_ROOT/deployments/${network}.json"
  python - "$CONTRACTS_DIR" "$TARGET_DIR" "$output_file" "$generated_at" "$network" "$source_key" "$ids_file" "${CONTRACT_CRATES[@]}" <<'PY'
import hashlib
import json
import pathlib
import re
import sys

contracts_dir = pathlib.Path(sys.argv[1])
target_dir = pathlib.Path(sys.argv[2])
output_file = pathlib.Path(sys.argv[3])
generated_at = sys.argv[4]
network = sys.argv[5]
source_key = sys.argv[6]
ids_file = pathlib.Path(sys.argv[7])
crates = sys.argv[8:]

ids = {}
for line in ids_file.read_text(encoding="utf-8").splitlines():
    crate, contract_id = line.split("=", 1)
    ids[crate] = contract_id.strip()

def crate_version(crate: str) -> str:
    cargo_toml = contracts_dir / "contracts" / crate / "Cargo.toml"
    text = cargo_toml.read_text(encoding="utf-8")
    match = re.search(r'(?m)^version\s*=\s*"([^"]+)"\s*$', text)
    if not match:
        raise RuntimeError(f"No version found in {cargo_toml}")
    return match.group(1)

contracts = {}
for crate in crates:
    wasm_name = crate.replace("-", "_") + ".wasm"
    wasm_path = target_dir / wasm_name
    content = wasm_path.read_bytes()
    contracts[crate] = {
        "contract_id": ids[crate],
        "source": source_key,
        "version": crate_version(crate),
        "wasm_file": str(wasm_path.relative_to(contracts_dir)),
        "sha256": hashlib.sha256(content).hexdigest(),
    }

payload = {
    "generated_at_utc": generated_at,
    "network": network,
    "target": "wasm32-unknown-unknown",
    "contracts": contracts,
}

output_file.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY

  rm -f "$ids_file"
  echo "Deployment metadata written to: $output_file"
}

print_help() {
  cat <<'EOF'
Usage:
  ./scripts/contracts-release.sh build
  ./scripts/contracts-release.sh verify
  ./scripts/contracts-release.sh deploy --network <network> --source <stellar-key-name>

Commands:
  build    Build all contract crates reproducibly and generate a manifest
  verify   Verify all expected artifacts exist and regenerate the manifest
  deploy   Deploy all artifacts and write per-network deployment metadata
EOF
}

main() {
  if [[ ! -d "$CONTRACTS_DIR" ]]; then
    echo "Could not find contracts directory: $CONTRACTS_DIR" >&2
    exit 1
  fi

  local cmd="${1:-}"
  case "$cmd" in
    build)
      build_all
      ;;
    verify)
      verify_only
      ;;
    deploy)
      shift || true
      local network=""
      local source_key=""
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --network)
            network="${2:-}"
            shift 2
            ;;
          --source)
            source_key="${2:-}"
            shift 2
            ;;
          *)
            echo "Unknown argument: $1" >&2
            print_help
            exit 1
            ;;
        esac
      done
      if [[ -z "$network" || -z "$source_key" ]]; then
        echo "deploy requires --network and --source" >&2
        print_help
        exit 1
      fi
      deploy_all "$network" "$source_key"
      ;;
    -h|--help|help|"")
      print_help
      ;;
    *)
      echo "Unknown command: $cmd" >&2
      print_help
      exit 1
      ;;
  esac
}

main "$@"
