//! Access-control module for the XConfess Soroban contract.
//!
//! File: xconfess-contract/src/access_control.rs
//!
//! # Role model
//!
//! ```text
//!  OWNER  ──▶ assign_admin / revoke_admin / transfer_ownership / update_config
//!   │
//!   └──▶ ADMIN  ──▶ resolve
//! ```
//!
//! One owner exists at all times (set during `initialize`).
//! Any number of admins may be active simultaneously.
//! Owner is implicitly an admin for every privileged function.
//!
//! # Storage layout
//!
//! | Key symbol  | Type              | Description                        |
//! |-------------|-------------------|------------------------------------|
//! | `OWNER`     | `Address`         | Single contract owner               |
//! | `ADMINS`    | `Map<Address,()>` | Set of granted admin addresses      |
//!
//! Using `Map<Address, ()>` rather than `Vec<Address>` gives O(1) membership
//! checks and clean revocation without index shifting.
//!
//! # Events
//!
//! Every role mutation emits a ledger event so off-chain indexers and the
//! NestJS `AuditLogService` (via Stellar horizon) can track role history.
//!
//! | Topic symbol        | Data                          |
//! |---------------------|-------------------------------|
//! | `admin_granted`     | `{ address: Address }`        |
//! | `admin_revoked`     | `{ address: Address }`        |
//! | `ownership_xfer`    | `{ from: Address, to: Address }` |

use soroban_sdk::{contracttype, symbol_short, Address, Env, Map};

// ─────────────────────────────────────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────────────────────────────────────

/// Typed storage key enum — lets the compiler catch key typos.
#[contracttype]
#[derive(Clone)]
pub enum AccessKey {
    Owner,
    Admins,
}

// ─────────────────────────────────────────────────────────────────────────────
// Error codes
// ─────────────────────────────────────────────────────────────────────────────

/// Contract-level error codes returned on privileged-action failures.
///
/// Using explicit `u32` discriminants lets the NestJS backend and frontend
/// match on stable numeric codes without parsing message strings.
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum AccessError {
    /// Caller is not the owner (code 1).
    NotOwner = 1,
    /// Caller is neither owner nor admin (code 2).
    NotAuthorized = 2,
    /// Target address is already an admin (code 3).
    AlreadyAdmin = 3,
    /// Target address is not an admin (cannot revoke) (code 4).
    NotAdmin = 4,
    /// Contract has not been initialized yet (code 5).
    NotInitialized = 5,
    /// Owner cannot remove their own admin rights (code 6).
    CannotDemoteOwner = 6,
    /// Cannot revoke last admin - would leave contract without authorized admin (code 7).
    CannotRevokeLastAdmin = 7,
    /// Cannot transfer ownership to same address (code 8).
    InvalidOwnershipTransfer = 8,
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

/// Set the initial owner. Must be called exactly once (from `initialize`).
/// Panics if an owner is already recorded — prevents re-initialization attacks.
pub fn init_owner(env: &Env, owner: &Address) {
    if env
        .storage()
        .instance()
        .has(&AccessKey::Owner)
    {
        panic!("already initialized");
    }
    env.storage()
        .instance()
        .set(&AccessKey::Owner, owner);

    // Initialize the admin set as empty
    let admins: Map<Address, ()> = Map::new(env);
    env.storage()
        .instance()
        .set(&AccessKey::Admins, &admins);
}

// ─────────────────────────────────────────────────────────────────────────────
// Role reads (pure — no auth required)
// ─────────────────────────────────────────────────────────────────────────────

/// Returns the current owner address.
/// Panics with `AccessError::NotInitialized` if `init_owner` was never called.
pub fn get_owner(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&AccessKey::Owner)
        .unwrap_or_else(|| panic!("{}", AccessError::NotInitialized as u32))
}

/// Returns `true` if `addr` is the current owner.
pub fn is_owner(env: &Env, addr: &Address) -> bool {
    get_owner(env) == *addr
}

/// Returns `true` if `addr` is in the admin set (owner is NOT implicitly
/// listed here; use `is_authorized` for the combined check).
pub fn is_admin(env: &Env, addr: &Address) -> bool {
    let admins: Map<Address, ()> = env
        .storage()
        .instance()
        .get(&AccessKey::Admins)
        .unwrap_or_else(|| Map::new(env));
    admins.contains_key(addr.clone())
}

/// Returns `true` if `addr` is the owner OR is an explicit admin.
/// Use this as the guard predicate for moderation-level actions (e.g. `resolve`).
pub fn is_authorized(env: &Env, addr: &Address) -> bool {
    is_owner(env, addr) || is_admin(env, addr)
}

/// Returns the total number of active admins (excluding the owner).
/// The owner is implicitly authorized but not counted in the admin set.
pub fn count_admins(env: &Env) -> u32 {
    let admins: Map<Address, ()> = env
        .storage()
        .instance()
        .get(&AccessKey::Admins)
        .unwrap_or_else(|| Map::new(env));
    admins.len() as u32
}

/// Returns the total number of authorized addresses (owner + admins).
/// This is used to ensure we never have zero authorized addresses.
pub fn count_authorized(env: &Env) -> u32 {
    // Owner is always authorized (1) + number of explicit admins
    1 + count_admins(env)
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth guards (call at the top of privileged entry points)
// ─────────────────────────────────────────────────────────────────────────────

/// Require that `caller` is the owner and has signed the invocation.
/// Panics with `AccessError::NotOwner` otherwise.
pub fn require_owner(env: &Env, caller: &Address) {
    caller.require_auth();
    if !is_owner(env, caller) {
        panic!("{}", AccessError::NotOwner as u32);
    }
}

/// Require that `caller` is the owner OR an admin and has signed.
/// Panics with `AccessError::NotAuthorized` otherwise.
pub fn require_admin_or_owner(env: &Env, caller: &Address) {
    caller.require_auth();
    if !is_authorized(env, caller) {
        panic!("{}", AccessError::NotAuthorized as u32);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role mutations (owner-only)
// ─────────────────────────────────────────────────────────────────────────────

/// Grant `target` the admin role.
///
/// * Caller must be the owner.
/// * Panics with `AccessError::AlreadyAdmin` if `target` is already an admin.
/// * Emits `admin_granted` event.
pub fn grant_admin(env: &Env, caller: &Address, target: &Address) {
    require_owner(env, caller);

    if is_admin(env, target) {
        panic!("{}", AccessError::AlreadyAdmin as u32);
    }

    let mut admins: Map<Address, ()> = env
        .storage()
        .instance()
        .get(&AccessKey::Admins)
        .unwrap_or_else(|| Map::new(env));

    admins.set(target.clone(), ());
    env.storage()
        .instance()
        .set(&AccessKey::Admins, &admins);

    // Emit audit event
    env.events().publish(
        (symbol_short!("adm_grant"), target.clone()),
        target.clone(),
    );
}

/// Revoke `target`'s admin role.
///
/// * Caller must be the owner.
/// * Panics with `AccessError::NotAdmin` if `target` is not currently an admin.
/// * Panics with `AccessError::CannotDemoteOwner` if `target` is the owner
///   (the owner is always implicitly authorized; removing them from the admin
///   map would create misleading authorization state).
/// * Panics with `AccessError::CannotRevokeLastAdmin` if revoking would leave 
///   the contract with zero authorized addresses.
/// * Emits `admin_revoked` event.
pub fn revoke_admin(env: &Env, caller: &Address, target: &Address) {
    require_owner(env, caller);

    if is_owner(env, target) {
        panic!("{}", AccessError::CannotDemoteOwner as u32);
    }

    if !is_admin(env, target) {
        panic!("{}", AccessError::NotAdmin as u32);
    }

    // Check minimum-admin invariant: ensure at least one authorized address remains
    let current_admins = count_admins(env);
    if current_admins <= 1 {
        // Emit governance failure event before panicking
        env.events().publish(
            (symbol_short!("gov_inv"),),
            ("revoke_admin", "Cannot revoke last admin - would leave contract with insufficient authorized addresses", caller.clone()),
        );
        panic!("{}", AccessError::CannotRevokeLastAdmin as u32);
    }

    let mut admins: Map<Address, ()> = env
        .storage()
        .instance()
        .get(&AccessKey::Admins)
        .unwrap_or_else(|| Map::new(env));

    admins.remove(target.clone());
    env.storage()
        .instance()
        .set(&AccessKey::Admins, &admins);

    // Emit audit event
    env.events().publish(
        (symbol_short!("adm_revoke"), target.clone()),
        target.clone(),
    );
}

/// Transfer contract ownership to `new_owner`.
///
/// * Caller must be the current owner.
/// * Panics with `AccessError::InvalidOwnershipTransfer` if transferring to same address.
/// * The old owner loses owner status (but retains any explicit admin entry
///   if one was previously granted — revoke separately if desired).
/// * `new_owner` is NOT automatically added to the admin set; they are the
///   owner, which is a superset of admin.
/// * Emits `own_xfer` event carrying both old and new addresses.
pub fn transfer_ownership(env: &Env, caller: &Address, new_owner: &Address) {
    require_owner(env, caller);

    // Snapshot old owner for validation and event before overwriting
    let old_owner = get_owner(env);
    
    // Prevent invalid transfer to same address
    if old_owner == *new_owner {
        panic!("{}", AccessError::InvalidOwnershipTransfer as u32);
    }

    // Check minimum-admin invariant: ensure we're not transferring away from the last
    // authorized address if the old owner is not in the admin set
    let current_admins = count_admins(env);
    if current_admins == 0 && !is_admin(env, &old_owner) {
        // Old owner is the only authorized address and not in admin set
        // After transfer, new owner would be authorized, so this is safe
        // But we should emit a governance event for transparency
    }

    env.storage()
        .instance()
        .set(&AccessKey::Owner, new_owner);

    // Emit audit event: topic carries new_owner; data carries old owner
    env.events().publish(
        (symbol_short!("own_xfer"), new_owner.clone()),
        old_owner,
    );
}