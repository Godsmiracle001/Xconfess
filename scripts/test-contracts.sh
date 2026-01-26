#!/bin/bash

# test-contracts.sh
# Run tests for all Soroban smart contracts in xConfess

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

# Parse command line arguments
VERBOSE=false
NOCAPTURE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --nocapture)
            NOCAPTURE=true
            shift
            ;;
        -h|--help)
            echo "Usage: ./scripts/test-contracts.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose    Show verbose test output"
            echo "  --nocapture      Show println! output from tests"
            echo "  -h, --help       Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

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

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    print_error "Cargo is not installed!"
    echo "Install Rust and Cargo: https://rustup.rs/"
    exit 1
fi

print_header "Testing xConfess Soroban Contracts"
print_info "Project root: $PROJECT_ROOT"
print_info "Contracts directory: $CONTRACTS_DIR"
echo ""

# Change to contracts directory
cd "$CONTRACTS_DIR"

# Check if this is a workspace
if grep -q "\[workspace\]" Cargo.toml; then
    print_info "Detected Cargo workspace - running all tests together"
    echo ""
    
    # Build test command arguments
    TEST_CMD="cargo test"
    if [ "$VERBOSE" = true ]; then
        TEST_CMD="$TEST_CMD --verbose"
    fi
    if [ "$NOCAPTURE" = true ]; then
        TEST_CMD="$TEST_CMD -- --nocapture"
    fi
    
    print_header "Running All Contract Tests"
    echo ""
    
    if eval $TEST_CMD; then
        echo ""
        print_success "✓ All workspace tests passed!"
        
        # Count test results from both contracts
        echo ""
        print_info "Workspace contains:"
        for contract in confession-anchor reputation-badges; do
            if [ -d "contracts/$contract" ]; then
                echo "  ✓ $contract"
            fi
        done
    else
        echo ""
        print_error "✗ Some tests failed"
        cd "$PROJECT_ROOT"
        exit 1
    fi
else
    # Not a workspace, test individually (original logic)
    print_error "This project is not configured as a Cargo workspace!"
    echo "Expected a [workspace] section in xconfess-contracts/Cargo.toml"
    echo "Individual contract testing is not implemented for non-workspace setups."
    cd "$PROJECT_ROOT"
    exit 1
fi

echo ""
print_header "Test Summary"

print_success "All contract tests completed successfully! ✓"

echo ""
print_info "Next steps:"
echo "  1. Build contracts: ./scripts/build-contracts.sh"
echo "  2. Deploy to testnet: ./scripts/deploy-contracts.sh"
echo "  3. Run with coverage: cargo tarpaulin --workspace"

# Return to original directory
cd "$PROJECT_ROOT"

exit 0