#!/bin/bash

# deploy-contracts.sh
# Deploy Soroban smart contracts to Stellar testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Configuration
NETWORK="testnet"
IDENTITY="deployer"
DEPLOYMENTS_FILE="xconfess-contracts/deployments.json"

# Check if running from project root
if [ ! -d "xconfess-contracts/" ]; then
    print_error "Error: Must run from project root directory"
    echo "Current directory: $(pwd)"
    echo "Please cd to the xConfess root directory"
    exit 1
fi

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    print_error "Stellar CLI is not installed!"
    echo ""
    echo "Install with: cargo install --locked stellar-cli --features opt"
    echo "Or see: https://soroban.stellar.org/docs/getting-started/setup"
    exit 1
fi

print_header "Deploying xConfess Contracts to Stellar Testnet"

# Check if network is configured
if ! stellar network ls | grep -q "^$NETWORK"; then
    print_warning "Network '$NETWORK' not configured"
    print_info "Configuring testnet..."
    
    stellar network add \
        --global testnet \
        --rpc-url https://soroban-testnet.stellar.org:443 \
        --network-passphrase "Test SDF Network ; September 2015"
    
    print_success "Network configured"
fi

# Check if identity exists
if ! stellar keys ls | grep -q "^$IDENTITY"; then
    print_warning "Identity '$IDENTITY' not found"
    echo ""
    echo "Please create an identity first:"
    echo "  stellar keys generate --global $IDENTITY --network $NETWORK"
    echo ""
    echo "Then fund your account:"
    echo "  curl \"https://friendbot.stellar.org?addr=\$(stellar keys address $IDENTITY)\""
    exit 1
fi

# Get deployer address
DEPLOYER_ADDRESS=$(stellar keys address $IDENTITY)
print_info "Deployer address: $DEPLOYER_ADDRESS"

# Check if account is funded
print_info "Checking account balance..."
if ! stellar keys fund $IDENTITY --network $NETWORK 2>/dev/null; then
    print_warning "Account may not be funded or Friendbot is unavailable"
    echo ""
    echo "Fund your account manually:"
    echo "  curl \"https://friendbot.stellar.org?addr=$DEPLOYER_ADDRESS\""
    echo ""
    read -p "Press Enter once account is funded, or Ctrl+C to cancel..."
fi

print_success "Account is funded"

# Array of contracts to deploy
declare -A CONTRACTS
CONTRACTS["confession-anchor"]="confession_anchor"
# Add more contracts as they're developed
CONTRACTS["reputation-badges"]="reputation_badges"
# CONTRACTS["anonymous-tipping"]="anonymous_tipping"

# Track deployment results
SUCCESSFUL_DEPLOYMENTS=0
FAILED_DEPLOYMENTS=0
FAILED_CONTRACTS=()

# Create/update deployments.json
if [ ! -f "$DEPLOYMENTS_FILE" ]; then
    print_info "Creating deployments.json..."
    echo "{}" > "$DEPLOYMENTS_FILE"
fi

# Function to update deployments.json
update_deployments() {
    local contract_name=$1
    local contract_id=$2
    local wasm_hash=$3
    
    # Read current JSON
    local current_json=$(cat "$DEPLOYMENTS_FILE")
    
    # Create new entry
    local new_entry=$(cat <<EOF
{
  "network": "$NETWORK",
  "contractId": "$contract_id",
  "wasmHash": "$wasm_hash",
  "lastUpdated": "$(date +%Y-%m-%d)",
  "deployerAddress": "$DEPLOYER_ADDRESS"
}
EOF
)
    
    # Update JSON using jq if available, otherwise simple replacement
    if command -v jq &> /dev/null; then
        echo "$current_json" | jq ".$contract_name = $new_entry" > "$DEPLOYMENTS_FILE"
    else
        # Simple JSON update without jq (basic, not production-grade)
        python3 -c "
import json
import sys

with open('$DEPLOYMENTS_FILE', 'r') as f:
    data = json.load(f)

data['$contract_name'] = json.loads('$new_entry')

with open('$DEPLOYMENTS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
"
    fi
}

# Deploy each contract
for contract_name in "${!CONTRACTS[@]}"; do
    wasm_name="${CONTRACTS[$contract_name]}"
    CONTRACT_DIR="xconfess-contracts"
    WASM_FILE="$CONTRACT_DIR/target/wasm32v1-none/release/$wasm_name.wasm"
    
    if [ ! -f "$WASM_FILE" ]; then
        print_warning "WASM file not found: $WASM_FILE"
        print_info "Building $contract_name first..."
        
        cd "$CONTRACT_DIR"
        if ! stellar contract build; then
            print_error "Failed to build $contract_name"
            FAILED_CONTRACTS+=("$contract_name")
            ((FAILED_DEPLOYMENTS++))
            cd - > /dev/null
            continue
        fi
        cd - > /dev/null
    fi
    
    echo ""
    print_info "Deploying $contract_name..."
    
    # Deploy contract
    CONTRACT_ID=$(stellar contract deploy \
        --wasm "$WASM_FILE" \
        --source "$IDENTITY" \
        --network 'testnet' \
        2>&1)
    
    if [ $? -eq 0 ]; then
        print_success "Deployed $contract_name"
        print_info "Contract ID: $CONTRACT_ID"
        
        # Get WASM hash
        WASM_HASH=$(sha256sum "$WASM_FILE" | awk '{print $1}')
        
        # Update deployments.json
        update_deployments "$contract_name" "$CONTRACT_ID" "$WASM_HASH"
        
        ((SUCCESSFUL_DEPLOYMENTS++))
    else
        print_error "Failed to deploy $contract_name"
        echo "Error: $CONTRACT_ID"
        FAILED_CONTRACTS+=("$contract_name")
        ((FAILED_DEPLOYMENTS++))
    fi
done

echo ""
print_header "Deployment Summary"

echo "Total contracts: ${#CONTRACTS[@]}"
print_success "Successful deployments: $SUCCESSFUL_DEPLOYMENTS"

if [ $FAILED_DEPLOYMENTS -gt 0 ]; then
    print_error "Failed deployments: $FAILED_DEPLOYMENTS"
    echo "Failed contracts:"
    for contract in "${FAILED_CONTRACTS[@]}"; do
        echo "  - $contract"
    done
    exit 1
fi

echo ""
print_success "All contracts deployed successfully! 🎉"

echo ""
print_info "Deployment details saved to: $DEPLOYMENTS_FILE"
cat "$DEPLOYMENTS_FILE"

echo ""
print_info "Next steps:"
echo "  1. Update environment variables with new contract IDs"
echo "  2. Test contract interactions"
echo "  3. Update frontend configuration"
echo "  4. See docs/SOROBAN_SETUP.md for contract interaction examples"

exit 0