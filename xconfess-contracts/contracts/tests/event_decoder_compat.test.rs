use soroban_sdk::{Env, testutils::Address as _};
use xconfess_contract::events::*;

#[test]
fn event_contains_version() {
    let env = Env::default();
    let addr = soroban_sdk::Address::generate(&env);

    let event = ConfessionEvent {
        event_version: EVENT_VERSION_V1,
        confession_id: 1,
        author: addr,
        content_hash: soroban_sdk::symbol_short!("hash"),
        nonce: 1,
        timestamp: 0,
        correlation_id: None,
    };

    assert_eq!(event.event_version, 1);
    assert_eq!(event.nonce, 1);
}

#[test]
fn schema_drift_guard() {
    use core::mem;

    let size = mem::size_of::<ConfessionEvent>();
    assert_eq!(size, mem::size_of::<ConfessionEvent>());
}
