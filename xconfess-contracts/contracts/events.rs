use soroban_sdk::{
    contracttype, symbol_short, Address, Env, Symbol,
};

/// ===========================================
/// GLOBAL EVENT VERSIONING
/// ===========================================
pub const EVENT_VERSION_V1: u32 = 1;

/// Stable discriminators (NEVER CHANGE)
pub const CONFESSION_EVENT: Symbol = symbol_short!("confess");
pub const REACTION_EVENT: Symbol = symbol_short!("react");
pub const REPORT_EVENT: Symbol = symbol_short!("report");
pub const ROLE_EVENT: Symbol = symbol_short!("role");

/// ===========================================
/// CONFESSION EVENT (V1) WITH OPTIONAL CORRELATION ID
/// ===========================================
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ConfessionEvent {
    pub event_version: u32,
    pub confession_id: u64,
    pub author: Address,
    pub content_hash: Symbol,
    pub timestamp: u64,
    pub correlation_id: Option<Symbol>, // new optional field
}

pub fn emit_confession(
    env: &Env,
    confession_id: u64,
    author: Address,
    content_hash: Symbol,
    correlation_id: Option<Symbol>, // optional parameter
) {
    let payload = ConfessionEvent {
        event_version: EVENT_VERSION_V1,
        confession_id,
        author,
        content_hash,
        timestamp: env.ledger().timestamp(),
        correlation_id,
    };

    env.events().publish((CONFESSION_EVENT,), payload);
}

/// ===========================================
/// REACTION EVENT (V1) WITH OPTIONAL CORRELATION ID
/// ===========================================
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReactionEvent {
    pub event_version: u32,
    pub confession_id: u64,
    pub reactor: Address,
    pub reaction_type: Symbol,
    pub timestamp: u64,
    pub correlation_id: Option<Symbol>,
}

pub fn emit_reaction(
    env: &Env,
    confession_id: u64,
    reactor: Address,
    reaction_type: Symbol,
    correlation_id: Option<Symbol>,
) {
    let payload = ReactionEvent {
        event_version: EVENT_VERSION_V1,
        confession_id,
        reactor,
        reaction_type,
        timestamp: env.ledger().timestamp(),
        correlation_id,
    };

    env.events().publish((REACTION_EVENT,), payload);
}

/// ===========================================
/// REPORT EVENT (V1) WITH OPTIONAL CORRELATION ID
/// ===========================================
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReportEvent {
    pub event_version: u32,
    pub confession_id: u64,
    pub reporter: Address,
    pub reason: Symbol,
    pub timestamp: u64,
    pub correlation_id: Option<Symbol>,
}

pub fn emit_report(
    env: &Env,
    confession_id: u64,
    reporter: Address,
    reason: Symbol,
    correlation_id: Option<Symbol>,
) {
    let payload = ReportEvent {
        event_version: EVENT_VERSION_V1,
        confession_id,
        reporter,
        reason,
        timestamp: env.ledger().timestamp(),
        correlation_id,
    };

    env.events().publish((REPORT_EVENT,), payload);
}

/// ===========================================
/// ROLE EVENT (V1) WITH OPTIONAL CORRELATION ID
/// ===========================================
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleEvent {
    pub event_version: u32,
    pub user: Address,
    pub role: Symbol,
    pub granted: bool,
    pub timestamp: u64,
    pub correlation_id: Option<Symbol>,
}

pub fn emit_role(
    env: &Env,
    user: Address,
    role: Symbol,
    granted: bool,
    correlation_id: Option<Symbol>,
) {
    let payload = RoleEvent {
        event_version: EVENT_VERSION_V1,
        user,
        role,
        granted,
        timestamp: env.ledger().timestamp(),
        correlation_id,
    };

    env.events().publish((ROLE_EVENT,), payload);
}

/// ===========================================
/// BACKWARD COMPATIBLE DECODERS
/// ===========================================
pub fn decode_confession_event(event: &ConfessionEvent) {
    match event.event_version {
        1 => {} // V1 decode
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