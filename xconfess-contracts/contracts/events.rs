use soroban_sdk::{
    contracttype, symbol_short, Address, Env, Symbol,
};

/// ===========================================
/// GLOBAL EVENT VERSIONING
/// ===========================================

pub const EVENT_VERSION_V1: u32 = 1;

/// ===========================================
/// MONOTONIC NONCE MANAGEMENT
/// ===========================================

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

/// Stable discriminators (NEVER CHANGE)
pub const CONFESSION_EVENT: Symbol = symbol_short!("confess");
pub const REACTION_EVENT: Symbol = symbol_short!("react");
pub const REPORT_EVENT: Symbol = symbol_short!("report");
pub const ROLE_EVENT: Symbol = symbol_short!("role");

/// ===========================================
/// CONFESSION EVENT (V1)
/// ===========================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfessionEvent {
    pub event_version: u32,
    pub nonce: u64,
    pub confession_id: u64,
    pub author: Address,
    pub content_hash: Symbol,
    pub timestamp: u64,
}

pub fn emit_confession(
    env: &Env,
    confession_id: u64,
    author: Address,
    content_hash: Symbol,
) {
    let nonce = next_nonce(env);
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

/// ===========================================
/// REACTION EVENT (V1)
/// ===========================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReactionEvent {
    pub event_version: u32,
    pub nonce: u64,
    pub confession_id: u64,
    pub reactor: Address,
    pub reaction_type: Symbol,
    pub timestamp: u64,
}

pub fn emit_reaction(
    env: &Env,
    confession_id: u64,
    reactor: Address,
    reaction_type: Symbol,
) {
    let nonce = next_nonce(env);
    let payload = ReactionEvent {
        event_version: EVENT_VERSION_V1,
        nonce,
        confession_id,
        reactor,
        reaction_type,
        timestamp: env.ledger().timestamp(),
    };

    env.events().publish((REACTION_EVENT,), payload);
}

/// ===========================================
/// REPORT EVENT (V1)
/// ===========================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReportEvent {
    pub event_version: u32,
    pub nonce: u64,
    pub confession_id: u64,
    pub reporter: Address,
    pub reason: Symbol,
    pub timestamp: u64,
}

pub fn emit_report(
    env: &Env,
    confession_id: u64,
    reporter: Address,
    reason: Symbol,
) {
    let nonce = next_nonce(env);
    let payload = ReportEvent {
        event_version: EVENT_VERSION_V1,
        nonce,
        confession_id,
        reporter,
        reason,
        timestamp: env.ledger().timestamp(),
    };

    env.events().publish((REPORT_EVENT,), payload);
}

/// ===========================================
/// ROLE EVENT (V1)
/// ===========================================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleEvent {
    pub event_version: u32,
    pub nonce: u64,
    pub user: Address,
    pub role: Symbol,
    pub granted: bool,
    pub timestamp: u64,
}

pub fn emit_role(
    env: &Env,
    user: Address,
    role: Symbol,
    granted: bool,
) {
    let nonce = next_nonce(env);
    let payload = RoleEvent {
        event_version: EVENT_VERSION_V1,
        nonce,
        user,
        role,
        granted,
        timestamp: env.ledger().timestamp(),
    };

    env.events().publish((ROLE_EVENT,), payload);
}

/// ===========================================
/// BACKWARD COMPATIBLE DECODER
/// ===========================================

pub fn decode_confession_event(event: &ConfessionEvent) {
    match event.event_version {
        1 => {
            // Safe decode logic for V1
        }
        _ => panic!("Unsupported confession event version"),
    }
}

pub fn decode_reaction_event(event: &ReactionEvent) {
    match event.event_version {
        1 => {}
        _ => panic!("Unsupported reaction event version"),
    }
}

pub fn decode_report_event(event: &ReportEvent) {
    match event.event_version {
        1 => {}
        _ => panic!("Unsupported report event version"),
    }
}

pub fn decode_role_event(event: &RoleEvent) {
    match event.event_version {
        1 => {}
        _ => panic!("Unsupported role event version"),
    }
}