# Contract Lifecycle and Administration Guide

This document provides comprehensive guidance on contract initialization, administration, and lifecycle management for all xConfess smart contracts.

## Table of Contents

- [Overview](#overview)
- [Contract Initialization](#contract-initialization)
- [Administrative Functions](#administrative-functions)
- [Lifecycle Management](#lifecycle-management)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

xConfess platform consists of three main smart contracts:

1. **ConfessionAnchor** - Stores tamper-proof confession hashes
2. **ReputationBadges** - Manages user reputation and badge system
3. **AnonymousTipping** - Handles anonymous tip distribution

Each contract has specific initialization requirements and administrative capabilities.

## Contract Initialization

### ConfessionAnchor Contract

#### Initialization Requirements

```rust
// Initialize the confession anchor contract
pub fn init(env: Env, admin: Address) {
    // Sets the contract administrator
    // Initializes confession counter
    // Sets up access control
}
```

#### Required Parameters

- `admin: Address` - The administrator address with full control over contract settings

#### Initialization Process

1. Deploy contract with administrator address
2. Contract automatically sets up:
   - Access control with admin as initial owner
   - Confession counter initialized to 0
   - Version information stored

#### Example Initialization

```bash
# Deploy ConfessionAnchor contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/confession_anchor.wasm \
  --source-account $ADMIN_KEY \
  --network testnet \
  -- \
  init \
  --admin $ADMIN_ADDRESS
```

### ReputationBadges Contract

#### Initialization Requirements

```rust
// Initialize the reputation badges contract
pub fn init(env: Env, admin: Address) {
    // Sets up badge system
    // Configures reputation thresholds
    // Initializes admin controls
}
```

#### Required Parameters

- `admin: Address` - Administrator address for badge management

#### Initialization Process

1. Deploy with administrator address
2. Contract configures:
   - Badge type definitions
   - Reputation calculation parameters
   - Administrative access controls

### AnonymousTipping Contract

#### Initialization Requirements

```rust
// Initialize the anonymous tipping contract
pub fn init(env: Env) {
    // Sets up settlement nonce
    // Initializes tip tracking
    // No admin required - fully decentralized
}
```

#### Initialization Process

1. Deploy contract (no administrator required)
2. Contract automatically:
   - Initializes settlement nonce to 0
   - Sets up tip tracking storage
   - Ready for anonymous tipping

#### Example Initialization

```bash
# Deploy AnonymousTipping contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/anonymous_tipping.wasm \
  --source-account $DEPLOYER_KEY \
  --network testnet
```

## Administrative Functions

### ConfessionAnchor Administration

#### Admin Management

```rust
// Transfer administrative rights
pub fn transfer_admin(env: Env, new_admin: Address) -> Result<(), Error>

// Check current administrator
pub fn get_admin(env: Env) -> Address
```

#### Administrative Capabilities

- **Transfer Admin**: Change contract administrator
- **View Admin**: Get current administrator address
- **Emergency Functions**: Contract pause/resume (if implemented)
- **Configuration**: Update contract parameters

#### Access Control

- Only administrator can call privileged functions
- All administrative actions emit events for audit trail
- Role-based access prevents privilege escalation

### ReputationBadges Administration

#### Badge Management

```rust
// Create new badge type
pub fn create_badge(env: Env, badge_info: BadgeInfo) -> Result<(), Error>

// Update badge criteria
pub fn update_badge_criteria(env: Env, badge_id: u64, criteria: String) -> Result<(), Error>

// Award badge to user
pub fn award_badge(env: Env, user: Address, badge_id: u64) -> Result<(), Error>
```

#### Administrative Capabilities

- **Badge Creation**: Define new reputation badges
- **Criteria Management**: Update badge awarding criteria
- **Badge Awards**: Manually award badges (if required)
- **Reputation Overrides**: Administrative reputation adjustments

### AnonymousTipping Administration

#### Decentralized Design

The AnonymousTipping contract is designed to be fully decentralized with **no administrative functions**:

- No administrator address
- No privileged functions
- No configuration parameters
- Immutable business logic

#### Monitoring Functions

```rust
// Get contract statistics
pub fn latest_settlement_nonce(env: Env) -> u64

// View tip totals
pub fn get_tips(env: Env, recipient: Address) -> i128
```

## Lifecycle Management

### Deployment Phase

#### Pre-Deployment Checklist

- [ ] Review contract code for security vulnerabilities
- [ ] Run comprehensive test suite
- [ ] Verify gas costs are reasonable
- [ ] Test on testnet thoroughly
- [ ] Prepare administrator addresses
- [ ] Document configuration parameters

#### Deployment Steps

1. **Build Contracts**
   ```bash
   cargo build --release --target wasm32-unknown-unknown
   ```

2. **Deploy to Testnet**
   ```bash
   stellar contract deploy --wasm contract.wasm --network testnet --source-account $DEPLOYER_KEY
   ```

3. **Initialize Contracts**
   ```bash
   # For contracts requiring admin
   stellar contract invoke --id $CONTRACT_ID --source-account $ADMIN_KEY -- init --admin $ADMIN_ADDRESS
   ```

4. **Verify Deployment**
   ```bash
   stellar contract info --id $CONTRACT_ID --network testnet
   ```

### Operational Phase

#### Monitoring

Key metrics to monitor:

- **ConfessionAnchor**: Daily confession counts, storage usage
- **ReputationBadges**: Badge awards, reputation distributions
- **AnonymousTipping**: Tip volumes, settlement rates

#### Event Monitoring

All contracts emit structured events:

```rust
// Example event structure
Event {
    topics: ("function_name", "additional_context"),
    data: (timestamp, parameters, result)
}
```

#### Health Checks

Regular health check procedures:

```bash
# Check contract status
stellar contract info --id $CONTRACT_ID --network testnet

# Verify admin functions
stellar contract invoke --id $CONTRACT_ID --source-account $ADMIN_KEY -- get_admin

# Check contract version
stellar contract invoke --id $CONTRACT_ID --source-account $ADMIN_KEY -- get_version
```

### Upgrade Phase

#### Contract Migration

When upgrading contracts:

1. **Data Migration Planning**
   - Identify storage layout changes
   - Plan data migration strategies
   - Prepare rollback procedures

2. **Upgrade Process**
   ```bash
   # Deploy new version
   stellar contract deploy --wasm new_contract.wasm --network testnet
   
   # Migrate data (if required)
   stellar contract invoke --id $NEW_CONTRACT_ID --migrate_from $OLD_CONTRACT_ID
   ```

3. **Verification**
   - Test all functions work correctly
   - Verify data integrity
   - Update frontend integration

#### Backward Compatibility

Maintain compatibility by:

- Preserving existing function signatures
- Using version negotiation
- Supporting deprecated functions during transition
- Providing migration tools

## Security Considerations

### Administrative Security

#### Access Control

- **Principle of Least Privilege**: Admin accounts have minimal required permissions
- **Multi-Sig Consideration**: For high-value contracts, consider multi-signature admin
- **Key Management**: Use hardware wallets for admin keys
- **Rotation Policy**: Regular admin key rotation

#### Audit Trail

All administrative actions should emit events:

```rust
// Example admin event
env.events().publish((
    "admin_action",
    "transfer_admin"
), (
    env.ledger().timestamp(),
    old_admin,
    new_admin,
    caller
));
```

### Operational Security

#### Contract Protection

- **Rate Limiting**: Implement for administrative functions
- **Time Locks**: Consider time delays for critical actions
- **Emergency Controls**: Circuit breakers for abnormal activity

#### Monitoring

Set up monitoring for:

- Unusual administrative activity
- Failed authentication attempts
- Large parameter changes
- Gas consumption anomalies

## Troubleshooting

### Common Issues

#### Initialization Failures

**Problem**: Contract deployment succeeds but initialization fails

**Solutions**:
1. Check administrator address format
2. Verify sufficient XLM balance
3. Ensure correct network configuration
4. Check contract WASM is valid

```bash
# Debug initialization
stellar contract invoke \
  --id $CONTRACT_ID \
  --source-account $ADMIN_KEY \
  --init \
  --admin $ADMIN_ADDRESS \
  --verbose
```

#### Administrative Access Issues

**Problem**: "Not authorized" errors when calling admin functions

**Solutions**:
1. Verify correct administrator address
2. Check if admin rights were transferred
3. Confirm contract is not paused
4. Verify network matches deployment

```bash
# Check current admin
stellar contract invoke --id $CONTRACT_ID --source-account $ADMIN_KEY -- get_admin

# If incorrect, transfer admin
stellar contract invoke --id $CONTRACT_ID --source-account $CURRENT_ADMIN --transfer_admin $NEW_ADMIN
```

#### Upgrade Issues

**Problem**: Contract upgrade fails or data loss

**Solutions**:
1. Verify data migration completeness
2. Check new contract version compatibility
3. Ensure sufficient gas for migration
4. Test on small subset first

### Emergency Procedures

#### Admin Recovery

If administrator keys are compromised:

1. **Immediate Actions**:
   - Transfer admin rights to new secure address
   - Document the transfer with event logs
   - Notify all relevant parties

2. **Verification**:
   - Test new admin access works
   - Verify old admin access is revoked
   - Update all dependent systems

#### Contract Pause

For contracts with pause functionality:

```rust
// Emergency pause
pub fn emergency_pause(env: Env) -> Result<(), Error>

// Resume operations
pub fn resume(env: Env) -> Result<(), Error>
```

## Best Practices

### Development

1. **Comprehensive Testing**: Test all administrative functions
2. **Event Logging**: Emit events for all significant actions
3. **Error Handling**: Provide clear error messages
4. **Documentation**: Keep admin documentation current

### Deployment

1. **Staged Deployment**: Testnet → Staging → Mainnet
2. **Backup Plans**: Have rollback procedures ready
3. **Monitoring**: Set up alerts for contract activity
4. **Documentation**: Document all configuration decisions

### Operations

1. **Regular Audits**: Periodically review administrative actions
2. **Key Rotation**: Regularly update administrator keys
3. **Monitoring**: Track contract performance and usage
4. **Incident Response**: Have procedures for security events

## Additional Resources

- [Stellar Contract Documentation](https://developers.stellar.org/docs/build/smart-contracts)
- [Soroban SDK Reference](https://soroban.stellar.org/docs/)
- [xConfess Contract Repository](https://github.com/xconfess/contracts)
- [Security Audit Reports](../docs/security-audits/)

For specific implementation details, refer to individual contract source files and their respective documentation.
