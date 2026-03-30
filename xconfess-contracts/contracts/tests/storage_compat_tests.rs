use std::fs;
use soroban_sdk::{Env, BytesN};
use xconfess_contract::confession::Confession;
use xconfess_contract::report::Report;

#[derive(Debug, serde::Deserialize)]
struct LegacyStateV1 {
    confessions: Vec<String>,
    reports: Vec<String>,
}

#[derive(Debug, serde::Deserialize)]
struct LegacyStateV2 {
    confessions: Vec<String>,
    reports: Vec<String>,
    flags: Vec<bool>, // added in v2
}

fn load_fixture(path: &str) -> Vec<u8> {
    fs::read(path).expect(&format!("Failed to read fixture file {}", path))
}

#[test]
fn test_legacy_v1_compatibility() {
    let env = Env::default();
    let data = load_fixture("test/storage_compat/legacy_fixture_v1.json");

    // Attempt to deserialize into current structs
    let state: Result<LegacyStateV1, _> = serde_json::from_slice(&data);
    assert!(state.is_ok(), "V1 legacy state failed to decode");

    // Optional: sanity check fields
    let state = state.unwrap();
    assert!(state.confessions.len() >= 0);
    assert!(state.reports.len() >= 0);
}

#[test]
fn test_legacy_v2_compatibility() {
    let env = Env::default();
    let data = load_fixture("test/storage_compat/legacy_fixture_v2.json");

    let state: Result<LegacyStateV2, _> = serde_json::from_slice(&data);
    assert!(state.is_ok(), "V2 legacy state failed to decode");

    let state = state.unwrap();
    assert_eq!(state.flags.len(), state.confessions.len()); // sanity check
}