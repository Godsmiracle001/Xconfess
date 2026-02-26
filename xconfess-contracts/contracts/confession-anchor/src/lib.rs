#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, BytesN, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfessionData {
    pub timestamp: u64,
    pub anchor_height: u32,
}

fn get_confession_store(env: &Env) -> soroban_sdk::storage::Instance {
    env.storage().instance()
}

fn get_count(env: &Env) -> u64 {
    let storage = env.storage().instance();
    let key = symbol_short!("count");
    match storage.get(&key) {
        Some(value) => value,
        None => 0u64,
    }
}

fn set_count(env: &Env, count: u64) {
    let storage = env.storage().instance();
    let key = symbol_short!("count");
    storage.set(&key, &count);
}

#[contract]
pub struct ConfessionAnchor;

#[contractimpl]
impl ConfessionAnchor {
    /// Anchor a new confession hash on-chain.
    /// - `hash`: 32-byte hash of the confession content.
    /// - `timestamp`: client-provided timestamp (e.g., ms since epoch).
    /// Returns a `Symbol` status:
    /// - "anchored" when stored successfully.
    /// - "exists" if the hash was already anchored (no-op).
    pub fn anchor_confession(env: Env, hash: BytesN<32>, timestamp: u64) -> Symbol {
        let storage = get_confession_store(&env);

        // Enforce uniqueness: if already anchored, do not overwrite.
        if storage.has(&hash) {
            return symbol_short!("exists");
        }

        let anchor_height = env.ledger().sequence();

        let data = ConfessionData {
            timestamp,
            anchor_height,
        };

        storage.set(&hash, &data);

        // Increment confession count.
        let current_count = get_count(&env);
        set_count(&env, current_count + 1);

        // Emit ConfessionAnchored event:
        // topics: ("confession_anchor", hash)
        // data: (timestamp, anchor_height)
        let event_topic = Symbol::new(&env, "confession_anchor");
        env.events()
            .publish((event_topic, hash.clone()), (timestamp, anchor_height));

        symbol_short!("anchored")
    }

    /// Verify whether a confession hash has been anchored.
    /// Returns `Some(timestamp)` if present, or `None` otherwise.
    pub fn verify_confession(env: Env, hash: BytesN<32>) -> Option<u64> {
        let storage = get_confession_store(&env);
        if !storage.has(&hash) {
            return None;
        }

        let data: ConfessionData = storage
            .get(&hash)
            .expect("confession data must exist if key is present");

        Some(data.timestamp)
    }

    /// Return the total number of unique anchored confessions.
    pub fn get_confession_count(env: Env) -> u64 {
        get_count(&env)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────
//
// Organisation
// ─────────────────────────────────────────────────────────────────────────────
//
// Group A – Original tests (preserved verbatim, no modifications)
//   anchor_and_verify_confession
//   duplicate_hash_does_not_overwrite
//   verify_nonexistent_confession_returns_none
//   multiple_confessions_update_count_and_events
//
// Group B – anchor_height contract
//   anchor_height_is_recorded_from_ledger_sequence
//   anchor_height_reflects_ledger_advance_between_anchors
//   duplicate_anchor_preserves_original_anchor_height
//
// Group C – Event emission contract
//   anchor_emits_exactly_one_event_per_unique_hash
//   anchor_event_carries_correct_timestamp_and_height
//   duplicate_anchor_does_not_emit_additional_event
//   multiple_anchors_each_emit_own_event
//
// Group D – Count invariants
//   count_is_zero_before_first_anchor
//   count_increments_by_one_per_unique_anchor
//   count_unchanged_by_duplicate_anchor
//   count_after_large_batch_of_unique_hashes
//
// Group E – Hash boundary values
//   all_zero_hash_is_valid
//   all_ff_hash_is_valid
//   min_max_timestamp_values_are_stored_correctly
//   two_hashes_differing_only_in_last_byte_are_distinct
//
// Group F – Full ConfessionData round-trip
//   confession_data_timestamp_field_matches_input
//   confession_data_anchor_height_field_matches_ledger_sequence
//
// Group G – Idempotency and ordering guarantees
//   anchor_then_verify_then_anchor_duplicate_is_stable
//   interleaved_unique_and_duplicate_anchors_keep_correct_count

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Events, Ledger, LedgerInfo},
        BytesN, Env, IntoVal,
    };

    // ── Shared test helpers ────────────────────────────────────────────────────

    /// Boot a fresh environment and client.
    fn new_client() -> (Env, ConfessionAnchorClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ConfessionAnchor);
        let client = ConfessionAnchorClient::new(&env, &contract_id);
        (env, client)
    }

    /// Build a 32-byte hash where `value` fills every byte.
    /// Using a fill rather than a single byte makes boundary tests more obvious.
    fn sample_hash(env: &Env, value: u8) -> BytesN<32> {
        BytesN::from_array(env, &[value; 32])
    }

    /// Build a hash with a single distinguishing byte at position `pos`.
    fn hash_with_byte_at(env: &Env, fill: u8, pos: usize, distinguished: u8) -> BytesN<32> {
        let mut bytes = [fill; 32];
        bytes[pos] = distinguished;
        BytesN::from_array(env, &bytes)
    }

    /// Advance the test ledger sequence by `delta`.
    fn advance_ledger(env: &Env, delta: u32) {
        let current = env.ledger().sequence();
        env.ledger().set(LedgerInfo {
            sequence_number: current + delta,
            ..env.ledger().get()
        });
    }

    // ── Group A: Original tests (preserved verbatim) ──────────────────────────

    #[test]
    fn anchor_and_verify_confession() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 1);
        let ts: u64 = 1_700_000_000_000;

        let status = client.anchor_confession(&hash, &ts);
        assert_eq!(status, symbol_short!("anchored"));

        let stored_ts = client.verify_confession(&hash);
        assert_eq!(stored_ts, Some(ts));

        let count = client.get_confession_count();
        assert_eq!(count, 1);
    }

    #[test]
    fn duplicate_hash_does_not_overwrite() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 2);

        let ts1: u64 = 1_700_000_000_000;
        let ts2: u64 = 1_800_000_000_000;

        let status1 = client.anchor_confession(&hash, &ts1);
        assert_eq!(status1, symbol_short!("anchored"));

        let status2 = client.anchor_confession(&hash, &ts2);
        assert_eq!(status2, symbol_short!("exists"));

        let stored_ts = client.verify_confession(&hash);
        assert_eq!(stored_ts, Some(ts1));

        let count = client.get_confession_count();
        assert_eq!(count, 1);
    }

    #[test]
    fn verify_nonexistent_confession_returns_none() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 3);

        let result = client.verify_confession(&hash);
        assert_eq!(result, None);
    }

    #[test]
    fn multiple_confessions_update_count_and_events() {
        let (env, client) = new_client();

        let hash1 = sample_hash(&env, 10);
        let hash2 = sample_hash(&env, 11);

        let ts1: u64 = 1_700_000_000_001;
        let ts2: u64 = 1_700_000_000_002;

        client.anchor_confession(&hash1, &ts1);
        client.anchor_confession(&hash2, &ts2);

        let count = client.get_confession_count();
        assert_eq!(count, 2);
    }

    // ── Group B: anchor_height contract ───────────────────────────────────────

    /// The anchor_height stored in ConfessionData must equal the ledger
    /// sequence number at the time of the call, not a default or zero.
    #[test]
    fn anchor_height_is_recorded_from_ledger_sequence() {
        let (env, client) = new_client();

        // Set a known ledger sequence so the assertion is deterministic.
        env.ledger().set(LedgerInfo {
            sequence_number: 42,
            ..env.ledger().get()
        });

        let hash = sample_hash(&env, 20);
        client.anchor_confession(&hash, &1_000);

        // Read ConfessionData directly from storage to inspect anchor_height.
        let data: ConfessionData = env
            .storage()
            .instance()
            .get(&hash)
            .expect("data must be present after anchoring");

        assert_eq!(
            data.anchor_height, 42,
            "anchor_height must equal the ledger sequence at anchor time"
        );
    }

    /// Two confessions anchored at different ledger heights must store
    /// different anchor_height values.
    #[test]
    fn anchor_height_reflects_ledger_advance_between_anchors() {
        let (env, client) = new_client();

        env.ledger().set(LedgerInfo {
            sequence_number: 100,
            ..env.ledger().get()
        });

        let hash_a = sample_hash(&env, 30);
        client.anchor_confession(&hash_a, &1_000);

        advance_ledger(&env, 50); // now at sequence 150

        let hash_b = sample_hash(&env, 31);
        client.anchor_confession(&hash_b, &2_000);

        let data_a: ConfessionData = env
            .storage()
            .instance()
            .get(&hash_a)
            .unwrap();
        let data_b: ConfessionData = env
            .storage()
            .instance()
            .get(&hash_b)
            .unwrap();

        assert_eq!(data_a.anchor_height, 100, "first confession anchored at sequence 100");
        assert_eq!(data_b.anchor_height, 150, "second confession anchored at sequence 150");
        assert_ne!(
            data_a.anchor_height, data_b.anchor_height,
            "confessions anchored at different ledger heights must have different anchor_height"
        );
    }

    /// A duplicate anchor attempt must NOT overwrite the original anchor_height,
    /// even if the ledger has advanced since the first anchor.
    #[test]
    fn duplicate_anchor_preserves_original_anchor_height() {
        let (env, client) = new_client();

        env.ledger().set(LedgerInfo {
            sequence_number: 10,
            ..env.ledger().get()
        });

        let hash = sample_hash(&env, 40);
        client.anchor_confession(&hash, &1_000);

        advance_ledger(&env, 999); // ledger now at 1009

        // Duplicate attempt — must be a no-op
        let status = client.anchor_confession(&hash, &9_999);
        assert_eq!(status, symbol_short!("exists"));

        let data: ConfessionData = env
            .storage()
            .instance()
            .get(&hash)
            .unwrap();

        assert_eq!(
            data.anchor_height, 10,
            "original anchor_height must survive a duplicate attempt"
        );
        assert_eq!(
            data.timestamp, 1_000,
            "original timestamp must survive a duplicate attempt"
        );
    }

    // ── Group C: Event emission contract ──────────────────────────────────────

    /// A successful anchor must emit exactly one event.
    #[test]
    fn anchor_emits_exactly_one_event_per_unique_hash() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 50);

        client.anchor_confession(&hash, &5_000);

        let events = env.events().all();
        assert_eq!(
            events.len(),
            1,
            "exactly one event must be emitted per successful anchor"
        );
    }

    /// The event's data payload must carry the exact timestamp and anchor_height
    /// that were stored — verified by decoding the raw event data.
    #[test]
    fn anchor_event_carries_correct_timestamp_and_height() {
        let (env, client) = new_client();

        env.ledger().set(LedgerInfo {
            sequence_number: 77,
            ..env.ledger().get()
        });

        let hash = sample_hash(&env, 51);
        let ts: u64 = 1_234_567_890;

        client.anchor_confession(&hash, &ts);

        let events = env.events().all();
        assert_eq!(events.len(), 1);

        // events().all() returns Vec<(ContractId, Topics, Data)>
        // Data is (timestamp: u64, anchor_height: u32) as encoded Val.
        let (_contract_id, _topics, data) = events.first().unwrap();

        // Decode the data tuple — Soroban encodes as a two-element Vec<Val>.
        let decoded: (u64, u32) = data.into_val(&env);
        assert_eq!(decoded.0, ts, "event data must carry the input timestamp");
        assert_eq!(
            decoded.1, 77,
            "event data must carry the ledger sequence as anchor_height"
        );
    }

    /// A duplicate anchor must NOT emit any additional event.
    #[test]
    fn duplicate_anchor_does_not_emit_additional_event() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 52);

        client.anchor_confession(&hash, &1_000);
        let count_after_first = env.events().all().len();

        client.anchor_confession(&hash, &2_000); // duplicate
        let count_after_duplicate = env.events().all().len();

        assert_eq!(
            count_after_first, count_after_duplicate,
            "a duplicate anchor must not emit any additional event"
        );
    }

    /// N unique hashes must emit exactly N events, one per anchor.
    #[test]
    fn multiple_anchors_each_emit_own_event() {
        let (env, client) = new_client();
        let n: u8 = 5;

        for i in 0..n {
            client.anchor_confession(&sample_hash(&env, 60 + i), &(i as u64 * 1_000));
        }

        let events = env.events().all();
        assert_eq!(
            events.len(),
            n as usize,
            "each unique anchor must produce exactly one event"
        );
    }

    // ── Group D: Count invariants ─────────────────────────────────────────────

    /// Count must be 0 before any anchor is stored.
    #[test]
    fn count_is_zero_before_first_anchor() {
        let (_env, client) = new_client();
        assert_eq!(
            client.get_confession_count(),
            0,
            "count must be 0 in a freshly deployed contract"
        );
    }

    /// Count increments by exactly 1 for each unique hash.
    #[test]
    fn count_increments_by_one_per_unique_anchor() {
        let (env, client) = new_client();

        for expected in 1u64..=5 {
            client.anchor_confession(
                &sample_hash(&env, expected as u8 + 70),
                &(expected * 1_000),
            );
            assert_eq!(
                client.get_confession_count(),
                expected,
                "count after {} unique anchor(s) must be {}",
                expected,
                expected
            );
        }
    }

    /// Count must not change when a duplicate anchor is attempted.
    #[test]
    fn count_unchanged_by_duplicate_anchor() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 80);

        client.anchor_confession(&hash, &1_000);
        assert_eq!(client.get_confession_count(), 1);

        // Ten duplicate attempts — count must stay at 1.
        for _ in 0..10 {
            client.anchor_confession(&hash, &9_999);
        }
        assert_eq!(
            client.get_confession_count(),
            1,
            "count must remain 1 after 10 duplicate anchor attempts"
        );
    }

    /// Count stays accurate across a large batch (stress check for no
    /// off-by-one in the increment logic).
    #[test]
    fn count_after_large_batch_of_unique_hashes() {
        let (env, client) = new_client();
        let n = 50u8;

        for i in 0..n {
            // Use distinct hashes to ensure uniqueness across the full range.
            let hash = hash_with_byte_at(&env, 0x00, 31, i);
            client.anchor_confession(&hash, &(i as u64));
        }

        assert_eq!(
            client.get_confession_count(),
            n as u64,
            "count must equal the number of unique hashes anchored"
        );
    }

    // ── Group E: Hash boundary values ─────────────────────────────────────────

    /// A 32-byte all-zero hash is a valid key (not treated as null/absent).
    #[test]
    fn all_zero_hash_is_valid() {
        let (env, client) = new_client();
        let hash = BytesN::from_array(&env, &[0x00u8; 32]);
        let ts: u64 = 1_000;

        let status = client.anchor_confession(&hash, &ts);
        assert_eq!(status, symbol_short!("anchored"));

        let stored = client.verify_confession(&hash);
        assert_eq!(stored, Some(ts));
    }

    /// A 32-byte all-0xFF hash is a valid key.
    #[test]
    fn all_ff_hash_is_valid() {
        let (env, client) = new_client();
        let hash = BytesN::from_array(&env, &[0xFFu8; 32]);
        let ts: u64 = 2_000;

        let status = client.anchor_confession(&hash, &ts);
        assert_eq!(status, symbol_short!("anchored"));

        let stored = client.verify_confession(&hash);
        assert_eq!(stored, Some(ts));
    }

    /// Timestamp 0 and u64::MAX are stored exactly — no truncation.
    #[test]
    fn min_max_timestamp_values_are_stored_correctly() {
        let (env, client) = new_client();

        let hash_min = hash_with_byte_at(&env, 0xAA, 0, 0x01);
        let hash_max = hash_with_byte_at(&env, 0xAA, 0, 0x02);

        client.anchor_confession(&hash_min, &0u64);
        client.anchor_confession(&hash_max, &u64::MAX);

        assert_eq!(client.verify_confession(&hash_min), Some(0u64));
        assert_eq!(client.verify_confession(&hash_max), Some(u64::MAX));
    }

    /// Two hashes identical except in their last byte must be stored as
    /// separate entries — the full 32-byte key is compared, not a prefix.
    #[test]
    fn two_hashes_differing_only_in_last_byte_are_distinct() {
        let (env, client) = new_client();

        let hash_a = hash_with_byte_at(&env, 0xCC, 31, 0x00);
        let hash_b = hash_with_byte_at(&env, 0xCC, 31, 0x01);

        client.anchor_confession(&hash_a, &100);
        client.anchor_confession(&hash_b, &200);

        assert_eq!(client.verify_confession(&hash_a), Some(100));
        assert_eq!(client.verify_confession(&hash_b), Some(200));
        assert_eq!(
            client.get_confession_count(),
            2,
            "hashes differing only in the last byte must be treated as distinct"
        );
    }

    // ── Group F: Full ConfessionData round-trip ────────────────────────────────

    /// Reading ConfessionData directly from storage must return the exact
    /// timestamp supplied to anchor_confession — not just what verify returns.
    #[test]
    fn confession_data_timestamp_field_matches_input() {
        let (env, client) = new_client();
        let ts: u64 = 9_876_543_210;
        let hash = sample_hash(&env, 90);

        client.anchor_confession(&hash, &ts);

        let data: ConfessionData = env
            .storage()
            .instance()
            .get(&hash)
            .expect("ConfessionData must exist after anchor");

        assert_eq!(
            data.timestamp, ts,
            "ConfessionData.timestamp must equal the anchor input"
        );
    }

    /// ConfessionData.anchor_height must equal the ledger sequence at call time.
    #[test]
    fn confession_data_anchor_height_field_matches_ledger_sequence() {
        let (env, client) = new_client();

        env.ledger().set(LedgerInfo {
            sequence_number: 999,
            ..env.ledger().get()
        });

        let hash = sample_hash(&env, 91);
        client.anchor_confession(&hash, &1_000);

        let data: ConfessionData = env
            .storage()
            .instance()
            .get(&hash)
            .unwrap();

        assert_eq!(
            data.anchor_height, 999,
            "ConfessionData.anchor_height must equal env.ledger().sequence() at anchor time"
        );
    }

    // ── Group G: Idempotency and ordering guarantees ───────────────────────────

    /// anchor → verify → anchor(duplicate) must leave storage and count stable.
    /// Models a client that retries an already-confirmed submission.
    #[test]
    fn anchor_then_verify_then_anchor_duplicate_is_stable() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 100);
        let ts: u64 = 5_555_555;

        // First anchor
        assert_eq!(client.anchor_confession(&hash, &ts), symbol_short!("anchored"));

        // Verify succeeds
        assert_eq!(client.verify_confession(&hash), Some(ts));
        assert_eq!(client.get_confession_count(), 1);

        // Advance ledger to prove the height would change on a fresh anchor
        advance_ledger(&env, 100);

        // Duplicate anchor — all state must be identical to post-first-anchor state
        assert_eq!(
            client.anchor_confession(&hash, &ts),
            symbol_short!("exists")
        );
        assert_eq!(client.verify_confession(&hash), Some(ts));
        assert_eq!(
            client.get_confession_count(),
            1,
            "idempotent retry must not change count"
        );
    }

    /// Interleaving unique and duplicate anchors must keep the count equal to
    /// only the number of unique hashes, regardless of operation order.
    #[test]
    fn interleaved_unique_and_duplicate_anchors_keep_correct_count() {
        let (env, client) = new_client();

        let hash_a = sample_hash(&env, 110);
        let hash_b = sample_hash(&env, 111);
        let hash_c = sample_hash(&env, 112);

        client.anchor_confession(&hash_a, &1_000); // unique → count 1
        client.anchor_confession(&hash_a, &9_999); // duplicate → count stays 1
        client.anchor_confession(&hash_b, &2_000); // unique → count 2
        client.anchor_confession(&hash_b, &9_999); // duplicate → count stays 2
        client.anchor_confession(&hash_c, &3_000); // unique → count 3
        client.anchor_confession(&hash_a, &9_999); // duplicate → count stays 3
        client.anchor_confession(&hash_c, &9_999); // duplicate → count stays 3

        assert_eq!(
            client.get_confession_count(),
            3,
            "count must equal unique hashes only, ignoring all duplicates"
        );

        // Verify all originals survived
        assert_eq!(client.verify_confession(&hash_a), Some(1_000));
        assert_eq!(client.verify_confession(&hash_b), Some(2_000));
        assert_eq!(client.verify_confession(&hash_c), Some(3_000));
    }
}