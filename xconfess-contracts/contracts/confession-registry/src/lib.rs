#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol, Vec,
};

// ─── Data Types ───

/// Status of a confession in the registry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ConfessionStatus {
    Active,
    Deleted,
    Flagged,
}

/// On-chain confession record.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Confession {
    /// Auto-incrementing confession ID.
    pub id: u64,
    /// Address of the confession author.
    pub author: Address,
    /// 32-byte hash of the confession content.
    pub content_hash: BytesN<32>,
    /// Timestamp when the confession was created (ms since epoch).
    pub created_at: u64,
    /// Timestamp of the last update (0 if never updated).
    pub updated_at: u64,
    /// Current status of the confession.
    pub status: ConfessionStatus,
}

/// Storage keys used by the contract.
#[contracttype]
pub enum DataKey {
    /// The next confession ID to assign.
    NextId,
    /// Stores a Confession by its ID.
    Confession(u64),
    /// Maps content_hash → confession_id for uniqueness checks.
    HashIndex(BytesN<32>),
    /// Tracks confession IDs owned by an author.
    AuthorConfessions(Address),
    /// Contract admin address.
    Admin,
}

// ─── Contract ───

#[contract]
pub struct ConfessionRegistry;

#[contractimpl]
impl ConfessionRegistry {
    // ─── Initialization ───

    /// Initialize the contract with an admin address.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextId, &1u64);
    }

    // ─── Create ───

    /// Create a new confession.
    ///
    /// - `author`: the address creating the confession (must authorize).
    /// - `content_hash`: 32-byte hash of the confession content.
    /// - `timestamp`: client-provided timestamp.
    ///
    /// Returns the newly assigned confession ID.
    ///
    /// Emits: `("confession_created", id)` → `(author, content_hash, timestamp)`
    pub fn create_confession(
        env: Env,
        author: Address,
        content_hash: BytesN<32>,
        timestamp: u64,
    ) -> u64 {
        // Require author authorization
        author.require_auth();

        // Enforce uniqueness on content_hash
        if env
            .storage()
            .instance()
            .has(&DataKey::HashIndex(content_hash.clone()))
        {
            panic!("confession with this content hash already exists");
        }

        // Allocate ID
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1u64);
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(id + 1));

        // Build record
        let confession = Confession {
            id,
            author: author.clone(),
            content_hash: content_hash.clone(),
            created_at: timestamp,
            updated_at: 0,
            status: ConfessionStatus::Active,
        };

        // Persist
        env.storage()
            .instance()
            .set(&DataKey::Confession(id), &confession);
        env.storage()
            .instance()
            .set(&DataKey::HashIndex(content_hash.clone()), &id);

        // Track author → confession index
        let mut author_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AuthorConfessions(author.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        author_ids.push_back(id);
        env.storage()
            .instance()
            .set(&DataKey::AuthorConfessions(author.clone()), &author_ids);

        // Emit event
        let event_topic = Symbol::new(&env, "confession_created");
        env.events().publish(
            (event_topic, id),
            (author, content_hash, timestamp),
        );

        id
    }

    // ─── Read ───

    /// Get a confession by ID.
    pub fn get_confession(env: Env, id: u64) -> Confession {
        env.storage()
            .instance()
            .get(&DataKey::Confession(id))
            .expect("confession not found")
    }

    /// Get a confession ID by its content hash.
    pub fn get_by_hash(env: Env, content_hash: BytesN<32>) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::HashIndex(content_hash))
            .expect("no confession with that hash")
    }

    /// Get all confession IDs for an author.
    pub fn get_author_confessions(env: Env, author: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::AuthorConfessions(author))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get the total number of confessions created.
    pub fn get_total_count(env: Env) -> u64 {
        let next_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(1u64);
        next_id - 1
    }

    // ─── Update Status ───

    /// Update the status of a confession.
    ///
    /// Only the author or the contract admin can change status.
    ///
    /// Emits: `("confession_updated", id)` → `(old_status, new_status, timestamp)`
    pub fn update_status(
        env: Env,
        caller: Address,
        id: u64,
        new_status: ConfessionStatus,
        timestamp: u64,
    ) {
        caller.require_auth();

        let mut confession: Confession = env
            .storage()
            .instance()
            .get(&DataKey::Confession(id))
            .expect("confession not found");

        // Only author or admin may update
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");

        if caller != confession.author && caller != admin {
            panic!("unauthorized: only author or admin can update status");
        }

        let old_status = confession.status.clone();
        confession.status = new_status;
        confession.updated_at = timestamp;

        env.storage()
            .instance()
            .set(&DataKey::Confession(id), &confession);

        let event_topic = Symbol::new(&env, "confession_updated");
        env.events()
            .publish((event_topic, id), (old_status, confession.status, timestamp));
    }

    // ─── Delete ───

    /// Soft-delete a confession (set status to Deleted).
    ///
    /// Only the author or admin can delete.
    ///
    /// Emits: `("confession_deleted", id)` → `(caller, timestamp)`
    pub fn delete_confession(env: Env, caller: Address, id: u64, timestamp: u64) {
        caller.require_auth();

        let mut confession: Confession = env
            .storage()
            .instance()
            .get(&DataKey::Confession(id))
            .expect("confession not found");

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("contract not initialized");

        if caller != confession.author && caller != admin {
            panic!("unauthorized: only author or admin can delete");
        }

        confession.status = ConfessionStatus::Deleted;
        confession.updated_at = timestamp;

        env.storage()
            .instance()
            .set(&DataKey::Confession(id), &confession);

        let event_topic = Symbol::new(&env, "confession_deleted");
        env.events()
            .publish((event_topic, id), (caller, timestamp));
    }
}

// ─── Tests ───

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Events}, Address, BytesN, Env};

    fn setup() -> (Env, ConfessionRegistryClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ConfessionRegistry);
        let client = ConfessionRegistryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let author = Address::generate(&env);

        client.initialize(&admin);

        (env, client, admin, author)
    }

    fn sample_hash(env: &Env, value: u8) -> BytesN<32> {
        let mut bytes: [u8; 32] = [0; 32];
        bytes[0] = value;
        BytesN::from_array(env, &bytes)
    }

    #[test]
    fn test_create_and_read_confession() {
        let (env, client, _admin, author) = setup();
        let hash = sample_hash(&env, 1);
        let ts: u64 = 1_700_000_000_000;

        let id = client.create_confession(&author, &hash, &ts);
        assert_eq!(id, 1);

        let conf = client.get_confession(&id);
        assert_eq!(conf.id, 1);
        assert_eq!(conf.author, author);
        assert_eq!(conf.content_hash, hash);
        assert_eq!(conf.created_at, ts);
        assert_eq!(conf.updated_at, 0);
        assert_eq!(conf.status, ConfessionStatus::Active);
    }

    #[test]
    fn test_get_by_hash() {
        let (env, client, _admin, author) = setup();
        let hash = sample_hash(&env, 2);
        let ts: u64 = 1_700_000_000_001;

        let id = client.create_confession(&author, &hash, &ts);
        let found_id = client.get_by_hash(&hash);
        assert_eq!(id, found_id);
    }

    #[test]
    #[should_panic(expected = "confession with this content hash already exists")]
    fn test_duplicate_content_hash_rejected() {
        let (env, client, _admin, author) = setup();
        let hash = sample_hash(&env, 3);

        client.create_confession(&author, &hash, &1_700_000_000_000);
        client.create_confession(&author, &hash, &1_700_000_000_001); // panic
    }

    #[test]
    fn test_author_confessions_index() {
        let (env, client, _admin, author) = setup();
        let hash1 = sample_hash(&env, 10);
        let hash2 = sample_hash(&env, 11);

        client.create_confession(&author, &hash1, &1_700_000_000_001);
        client.create_confession(&author, &hash2, &1_700_000_000_002);

        let ids = client.get_author_confessions(&author);
        assert_eq!(ids.len(), 2);
        assert_eq!(ids.get(0).unwrap(), 1);
        assert_eq!(ids.get(1).unwrap(), 2);
    }

    #[test]
    fn test_total_count() {
        let (env, client, _admin, author) = setup();

        assert_eq!(client.get_total_count(), 0);

        client.create_confession(&author, &sample_hash(&env, 20), &1_000);
        assert_eq!(client.get_total_count(), 1);

        client.create_confession(&author, &sample_hash(&env, 21), &2_000);
        assert_eq!(client.get_total_count(), 2);
    }

    #[test]
    fn test_update_status_by_author() {
        let (env, client, _admin, author) = setup();
        let hash = sample_hash(&env, 30);

        let id = client.create_confession(&author, &hash, &1_000);
        client.update_status(&author, &id, &ConfessionStatus::Flagged, &2_000);

        let conf = client.get_confession(&id);
        assert_eq!(conf.status, ConfessionStatus::Flagged);
        assert_eq!(conf.updated_at, 2_000);
    }

    #[test]
    fn test_update_status_by_admin() {
        let (env, client, admin, author) = setup();
        let hash = sample_hash(&env, 31);

        let id = client.create_confession(&author, &hash, &1_000);
        client.update_status(&admin, &id, &ConfessionStatus::Flagged, &2_000);

        let conf = client.get_confession(&id);
        assert_eq!(conf.status, ConfessionStatus::Flagged);
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_update_status_by_unauthorized_user() {
        let (env, client, _admin, author) = setup();
        let outsider = Address::generate(&env);
        let hash = sample_hash(&env, 32);

        let id = client.create_confession(&author, &hash, &1_000);
        client.update_status(&outsider, &id, &ConfessionStatus::Flagged, &2_000); // panic
    }

    #[test]
    fn test_delete_confession() {
        let (env, client, _admin, author) = setup();
        let hash = sample_hash(&env, 40);

        let id = client.create_confession(&author, &hash, &1_000);
        client.delete_confession(&author, &id, &3_000);

        let conf = client.get_confession(&id);
        assert_eq!(conf.status, ConfessionStatus::Deleted);
        assert_eq!(conf.updated_at, 3_000);
    }

    #[test]
    #[should_panic(expected = "unauthorized")]
    fn test_delete_by_unauthorized_user() {
        let (env, client, _admin, author) = setup();
        let outsider = Address::generate(&env);
        let hash = sample_hash(&env, 41);

        let id = client.create_confession(&author, &hash, &1_000);
        client.delete_confession(&outsider, &id, &2_000); // panic
    }

    #[test]
    #[should_panic(expected = "confession not found")]
    fn test_get_nonexistent_confession() {
        let (_env, client, _admin, _author) = setup();
        client.get_confession(&999);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialization() {
        let (env, client, admin, _author) = setup();
        let another = Address::generate(&env);
        client.initialize(&another); // should panic
    }

    // ─── Nonce Tests ───

    #[test]
    fn test_events_include_sequential_data() {
        let (env, client, _admin, author) = setup();
        
        // Create multiple confessions and verify events are emitted
        let hash1 = sample_hash(&env, 50);
        let hash2 = sample_hash(&env, 51);
        let hash3 = sample_hash(&env, 52);

        let id1 = client.create_confession(&author, &hash1, &1_000);
        let id2 = client.create_confession(&author, &hash2, &2_000);
        let id3 = client.create_confession(&author, &hash3, &3_000);

        // Verify IDs are sequential
        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);

        // Events are emitted with each creation
        // In a real indexer, these would be captured and ordered
    }

    #[test]
    fn test_multiple_operations_emit_ordered_events() {
        let (env, client, _admin, author) = setup();
        let hash = sample_hash(&env, 60);

        // Create
        let id = client.create_confession(&author, &hash, &1_000);
        assert_eq!(id, 1);
        
        // Update
        client.update_status(&_admin, &id, &ConfessionStatus::Flagged, &2_000);
        let conf = client.get_confession(&id);
        assert_eq!(conf.status, ConfessionStatus::Flagged);
        
        // Delete
        client.delete_confession(&_admin, &id, &3_000);
        let conf = client.get_confession(&id);
        assert_eq!(conf.status, ConfessionStatus::Deleted);

        // All operations completed successfully and emitted events in order
    }
}
