#!/bin/bash

# build-contracts.sh
# Build all Soroban smart contracts for xConfess

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

# Determine project root and contracts directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/xconfess-contracts"

# Check if contracts directory exists
if [ ! -d "$CONTRACTS_DIR" ]; then
    print_error "Error: xconfess-contracts directory not found!"
    echo "Expected location: $CONTRACTS_DIR"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if Cargo.toml exists in contracts directory
if [ ! -f "$CONTRACTS_DIR/Cargo.toml" ]; then
    print_error "Error: Cargo.toml not found in xconfess-contracts!"
    echo "Expected location: $CONTRACTS_DIR/Cargo.toml"
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

print_header "Building xConfess Soroban Contracts"
print_info "Project root: $PROJECT_ROOT"
print_info "Contracts directory: $CONTRACTS_DIR"
echo ""

# Change to contracts directory
cd "$CONTRACTS_DIR"

# Array of contracts to build
CONTRACTS=(
    "confession-anchor"
    "reputation-badges"
)

# Track build results
SUCCESSFUL_BUILDS=0
FAILED_BUILDS=0
FAILED_CONTRACTS=()

# Build all contracts using stellar contract build
print_info "Running stellar contract build..."
echo ""

if stellar contract build; then
    print_success "Build command completed"
    echo ""
else
    print_error "Build failed!"
    exit 1
fi

echo ""
print_header "Build Summary"

echo "Total contracts: ${#CONTRACTS[@]}"

if [ $FAILED_BUILDS -gt 0 ]; then
    print_error "Failed builds: $FAILED_BUILDS"
    echo "Failed contracts:"
    for contract in "${FAILED_CONTRACTS[@]}"; do
        echo "  - $contract"
    done
    exit 1
fi

echo ""
print_success "All contracts built successfully! 🎉"

# Display all WASM files in the release directory
echo ""
print_header "WASM Files in Release Directory"
RELEASE_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"
print_info "Location: $RELEASE_DIR"
echo ""

if [ -d "$RELEASE_DIR" ]; then
    WASM_COUNT=$(find "$RELEASE_DIR" -maxdepth 1 -name "*.wasm" -type f | wc -l)
    
    if [ $WASM_COUNT -gt 0 ]; then
        printf "%-30s %-10s %-s\n" "CONTRACT" "SIZE" "HASH"
        echo "--------------------------------------------------------------------------------"
        
        for wasm_file in "$RELEASE_DIR"/*.wasm; do
            if [ -f "$wasm_file" ]; then
                FILENAME=$(basename "$wasm_file")
                CONTRACT_NAME="${FILENAME%.wasm}"
                SIZE=$(ls -lh "$wasm_file" | awk '{print $5}')
                BYTES=$(stat -f%z "$wasm_file" 2>/dev/null || stat -c%s "$wasm_file" 2>/dev/null)
                HASH=$(sha256sum "$wasm_file" | awk '{print $1}')
                
                printf "%-30s %-10s %s\n" "$CONTRACT_NAME" "$SIZE" "$HASH"
                echo "  📍 $wasm_file"
                echo ""
            fi
        done
        
        print_success "Total WASM files found: $WASM_COUNT"
    else
        print_warning "No WASM files found in release directory"
    fi
else
    print_error "Release directory not found: $RELEASE_DIR"
fi

# Display centralized WASM location
echo ""
print_info "Next steps:"
echo "  1. Run tests: cd xconfess-contracts && cargo test"
echo "  2. Deploy to testnet: ./scripts/deploy-contracts.sh"
echo "  3. Optimize WASMs: stellar contract optimize --wasm target/wasm32v1-none/release/*.wasm"

# Return to original directory
cd "$PROJECT_ROOT"

exit 0