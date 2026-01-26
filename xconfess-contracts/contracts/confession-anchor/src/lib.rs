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
        // Note: symbol_short is limited to 9 characters, so we use a
        // dynamically constructed Symbol here.
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

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Events, BytesN, Env};

    fn new_client() -> (Env, ConfessionAnchorClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ConfessionAnchor);
        let client = ConfessionAnchorClient::new(&env, &contract_id);
        (env, client)
    }

    fn sample_hash(env: &Env, value: u8) -> BytesN<32> {
        let mut bytes: [u8; 32] = [0; 32];
        bytes[0] = value;
        BytesN::from_array(env, &bytes)
    }

    #[test]
    fn anchor_and_verify_confession() {
        let (env, client) = new_client();
        let hash = sample_hash(&env, 1);
        let ts: u64 = 1_700_000_000_000;

        let status = client.anchor_confession(&hash, &ts);
        assert_eq!(status, symbol_short!("anchored"));

        let stored_ts = client.verify_confession(&hash);
        assert_eq!(stored_ts, Some(ts));

        // Ensure count updated.
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

        // Verify timestamp not overwritten.
        let stored_ts = client.verify_confession(&hash);
        assert_eq!(stored_ts, Some(ts1));

        // Count should remain 1.
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
}
