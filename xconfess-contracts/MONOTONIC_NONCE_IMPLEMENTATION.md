# Monotonic Event Nonce Implementation

## Overview

This document describes the implementation of monotonic event nonces for the XConfess smart contracts. Monotonic nonces provide deterministic ordering for all state-changing events, enabling indexers and downstream consumers to reliably detect gaps, duplicates, and out-of-order events.

## Problem Statement

Without monotonic nonces, event ordering relies solely on timestamps and block order, which can lead to:

- Ambiguous ordering when multiple events occur in the same block
- Difficulty detecting missing events (gaps)
- Inability to detect duplicate or replayed events
- Complex reconciliation logic for indexers

## Solution

We've implemented a global monotonic nonce counter that increments by exactly 1 for every state-changing event emitted by the contract. Each event payload now includes a `nonce` field that provides deterministic ordering.

## Implementation Details

### Core Components

#### 1. Global Nonce Storage (`events.rs`)

```rust
/// Storage key for the global event nonce counter
const NONCE_KEY: Symbol = symbol_short!("ev_nonce");

/// Get the current global event nonce without incrementing
pub fn get_current_nonce(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&NONCE_KEY)
        .unwrap_or(0u64)
}

/// Increment and return the next event nonce
fn next_nonce(env: &Env) -> u64 {
    let current = get_current_nonce(env);
    let next = current + 1;
    env.storage().instance().set(&NONCE_KEY, &next);
    next
}
```

#### 2. Updated Event Structures

All event structures now include a `nonce` field:

**ConfessionEvent:**

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfessionEvent {
    pub event_version: u32,
    pub nonce: u64,           // NEW: Monotonic nonce
    pub confession_id: u64,
    pub author: Address,
    pub content_hash: Symbol,
    pub timestamp: u64,
}
```

**ReactionEvent:**

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReactionEvent {
    pub event_version: u32,
    pub nonce: u64,           // NEW: Monotonic nonce
    pub confession_id: u64,
    pub reactor: Address,
    pub reaction_type: Symbol,
    pub timestamp: u64,
}
```

**ReportEvent:**

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReportEvent {
    pub event_version: u32,
    pub nonce: u64,           // NEW: Monotonic nonce
    pub confession_id: u64,
    pub reporter: Address,
    pub reason: Symbol,
    pub timestamp: u64,
}
```

**RoleEvent:**

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleEvent {
    pub event_version: u32,
    pub nonce: u64,           // NEW: Monotonic nonce
    pub user: Address,
    pub role: Symbol,
    pub granted: bool,
    pub timestamp: u64,
}
```

#### 3. Event Emission Functions

All event emission functions now automatically include the nonce:

```rust
pub fn emit_confession(
    env: &Env,
    confession_id: u64,
    author: Address,
    content_hash: Symbol,
) {
    let nonce = next_nonce(env);  // Automatically increment
    let payload = ConfessionEvent {
        event_version: EVENT_VERSION_V1,
        nonce,
        confession_id,
        author,
        content_hash,
        timestamp: env.ledger().timestamp(),
    };

    env.events().publish((CONFESSION_EVENT,), payload);
}
```

#### 4. Governance Events

Governance events also include nonces with their own counter:

```rust
/// Storage key for governance event nonce counter
const GOV_NONCE_KEY: &str = "gov_nonce";

pub fn proposed(e: &Env, current: Address, proposed: Address) {
    let nonce = next_gov_nonce(e);
    e.events().publish(
        (symbol_short!("gov_prop"),),
        (nonce, current, proposed),
    );
}

/// Public function to query the latest governance event nonce
pub fn get_latest_gov_nonce(env: &Env) -> u64 {
    get_gov_nonce(env)
}
```

## Nonce Properties

### 1. Monotonic Increasing

- Nonces start at 0
- Each event increments the nonce by exactly 1
- Nonces never decrease or skip values

### 2. Global Ordering

- All event types share the same nonce counter
- Provides total ordering across different event streams
- Enables cross-entity event ordering

### 3. Deterministic

- Same sequence of operations always produces same nonce sequence
- No randomness or external dependencies
- Reproducible for testing and verification

### 4. Persistent

- Nonces are stored in contract instance storage
- Survive contract upgrades and restarts
- Can be queried at any time via `get_current_nonce()`

## Indexer Integration

### Gap Detection

Indexers can detect missing events by checking for gaps in the nonce sequence:

```rust
fn detect_gaps(events: Vec<Event>) -> Vec<(u64, u64)> {
    let mut gaps = Vec::new();
    let mut last_nonce = 0u64;

    for event in events {
        let expected = last_nonce + 1;
        if event.nonce != expected && last_nonce > 0 {
            gaps.push((expected, event.nonce));
        }
        last_nonce = event.nonce;
    }

    gaps
}
```

### Duplicate Detection

Indexers can detect duplicate or replayed events:

```rust
fn detect_duplicates(events: Vec<Event>) -> Vec<u64> {
    let mut seen = HashSet::new();
    let mut duplicates = Vec::new();

    for event in events {
        if !seen.insert(event.nonce) {
            duplicates.push(event.nonce);
        }
    }

    duplicates
}
```

### Reconciliation

Indexers can reconcile their state with the contract:

```rust
// Query the latest nonce from the contract
let latest_nonce = contract.get_current_nonce();

// Compare with indexer's last seen nonce
let indexer_last_seen = indexer.get_last_nonce();

// Calculate missing events
let missing_count = latest_nonce - indexer_last_seen;

if missing_count > 0 {
    // Fetch missing events from nonce range
    fetch_events_from_range(indexer_last_seen + 1, latest_nonce);
}
```

### Out-of-Order Detection

Indexers can detect if events arrive out of order:

```rust
fn is_out_of_order(event: Event, last_seen_nonce: u64) -> bool {
    event.nonce <= last_seen_nonce
}
```

## Testing

### Unit Tests

Comprehensive unit tests verify nonce behavior:

1. **Monotonic Increment**: Verifies nonces increment by exactly 1
2. **Mixed Event Types**: Confirms all event types share the same counter
3. **High Volume**: Tests nonce behavior under high event volume
4. **Persistence**: Verifies nonces persist across operations

### Integration Tests

Integration tests simulate real-world indexer scenarios:

1. **Sequential Processing**: Verifies no gaps in normal operation
2. **Gap Detection**: Simulates missing events and verifies detection
3. **Duplicate Detection**: Simulates replayed events and verifies detection
4. **Reconciliation**: Tests indexer state reconciliation
5. **Multi-Entity Ordering**: Verifies global ordering across entities

## Migration Guide

### For Contract Developers

No changes required to existing contract code. Event emission functions automatically include nonces.

### For Indexers

1. **Update Event Schemas**: Add `nonce: u64` field to all event structures
2. **Implement Gap Detection**: Check for missing nonces in event stream
3. **Implement Duplicate Detection**: Track seen nonces to detect replays
4. **Add Reconciliation**: Periodically query `get_current_nonce()` to verify completeness
5. **Handle Out-of-Order**: Sort events by nonce before processing

### Example Indexer Code

```typescript
interface Event {
  nonce: number;
  // ... other fields
}

class EventIndexer {
  private lastSeenNonce: number = 0;
  private seenNonces: Set<number> = new Set();

  async processEvent(event: Event): Promise<void> {
    // Check for gaps
    if (event.nonce !== this.lastSeenNonce + 1 && this.lastSeenNonce > 0) {
      await this.handleGap(this.lastSeenNonce + 1, event.nonce);
    }

    // Check for duplicates
    if (this.seenNonces.has(event.nonce)) {
      console.warn(`Duplicate event detected: nonce ${event.nonce}`);
      return;
    }

    // Process event
    await this.indexEvent(event);

    // Update tracking
    this.seenNonces.add(event.nonce);
    this.lastSeenNonce = event.nonce;
  }

  async reconcile(contractAddress: string): Promise<void> {
    const latestNonce = await contract.get_current_nonce();
    const missing = latestNonce - this.lastSeenNonce;

    if (missing > 0) {
      console.log(`Missing ${missing} events, fetching...`);
      await this.fetchMissingEvents(this.lastSeenNonce + 1, latestNonce);
    }
  }
}
```

## Performance Considerations

### Storage Cost

- Each nonce increment requires one storage write
- Storage key is a short symbol for efficiency
- Nonce is a u64, providing 2^64 possible events

### Gas Cost

- Minimal additional gas cost per event emission
- Single storage read + write per event
- No complex computations required

### Scalability

- u64 nonce supports 18,446,744,073,709,551,615 events
- At 1 million events per day, would last 50 billion years
- No practical limit for any real-world application

## Benefits

1. **Deterministic Ordering**: Total ordering of all events
2. **Gap Detection**: Easily identify missing events
3. **Duplicate Detection**: Identify replayed or duplicate events
4. **Reconciliation**: Simple state verification for indexers
5. **Debugging**: Easier to trace event sequences
6. **Reliability**: Reduces indexer complexity and error rates

## Files Modified

- `xconfess-contracts/contracts/events.rs` - Added nonce management and updated event structures
- `xconfess-contracts/contracts/governance/events.rs` - Added nonces to governance events
- `xconfess-contracts/contracts/confession-registry/src/lib.rs` - Added nonce-related tests
- `xconfess-contracts/contracts/tests/monotonic_nonce.test.rs` - Comprehensive unit tests
- `xconfess-contracts/contracts/tests/integration/nonce_ordering.rs` - Integration tests

## Backward Compatibility

### Event Version

All events include `event_version: u32` field set to `EVENT_VERSION_V1 = 1`. Future versions can modify the event structure while maintaining backward compatibility through version checking.

### Decoder Functions

Existing decoder functions remain unchanged:

```rust
pub fn decode_confession_event(event: &ConfessionEvent) {
    match event.event_version {
        1 => {
            // Safe decode logic for V1 (includes nonce)
        }
        _ => panic!("Unsupported confession event version"),
    }
}
```

## Future Enhancements

1. **Per-Entity Nonces**: Add entity-specific nonce counters for finer-grained ordering
2. **Nonce Checkpoints**: Periodic nonce snapshots for faster reconciliation
3. **Nonce Ranges**: Query events by nonce range
4. **Nonce Metadata**: Additional metadata about nonce generation

## Conclusion

The monotonic nonce implementation provides a robust foundation for reliable event ordering and indexing. It enables downstream consumers to build reliable, gap-free indexes of contract state changes with minimal complexity.
