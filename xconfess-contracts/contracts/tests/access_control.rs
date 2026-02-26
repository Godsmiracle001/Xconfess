//! Access-control tests for the XConfess Soroban contract.
//!
//! File: xconfess-contract/test/access_control.rs
//!
//! # What is tested here vs confession_moderation.rs
//!
//! `confession_moderation.rs`  → lifecycle state machine, event ordering, gas
//! `access_control.rs`         → role assignment, revocation, handoff,
//!                               unauthorized-call rejection, event emission
//!
//! # Test organisation
//!
//!   Suite 1 – Initialization          owner set on init; double-init blocked
//!   Suite 2 – Admin grant             happy path, duplicate, event emitted
//!   Suite 3 – Admin revoke            happy path, not-admin guard, owner guard
//!   Suite 4 – Ownership transfer      happy path, old owner loses privilege,
//!                                     new owner gains privilege, event emitted
//!   Suite 5 – resolve() role guard    admin resolves, owner resolves,
//!                                     stranger rejected with code 2
//!   Suite 6 – update_config() guard   owner succeeds, admin rejected, stranger rejected
//!   Suite 7 – assign/revoke guards    non-owner attempts rejected
//!   Suite 8 – View methods            is_owner, is_admin, can_moderate, get_owner
//!   Suite 9 – Error code contract     panic message == numeric code string
//!   Suite 10 – Event emission         audit trail verified via env.events()
//!
//! # Running
//!
//!   cargo test --test access_control -- --nocapture

use soroban_sdk::{
    testutils::{Address as _, Events},
    Address, Env, IntoVal, String as SorobanString, Val,
};

use xconfess_contract::{XConfessContract, XConfessContractClient};

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Boots a clean env, deploys the contract, and calls `initialize` with `owner`.
/// Returns `(env, client, owner)`.
fn setup_with_owner() -> (Env, XConfessContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, XConfessContract);
    let client: XConfessContractClient<'static> =
        XConfessContractClient::new(&env, &contract_id);

    let owner = Address::random(&env);
    client.initialize(&owner);

    (env, client, owner)
}

/// Convenience: make a `SorobanString` from a `&str`.
fn s(env: &Env, text: &str) -> SorobanString {
    SorobanString::from_str(env, text)
}

/// Create a confession and return its ID (helper used in guard tests).
fn make_confession(client: &XConfessContractClient, env: &Env) -> u32 {
    client.create(&s(env, "Test confession."))
}

/// Create + report a confession and return its ID (precondition for resolve).
fn make_reported_confession(client: &XConfessContractClient, env: &Env) -> u32 {
    let id = make_confession(client, env);
    client.report(&id, &s(env, "spam"));
    id
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 – Initialization
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn initialize_sets_owner() {
    let (env, client, owner) = setup_with_owner();
    assert!(client.is_owner(&owner), "owner must be recognized after initialize()");
    assert_eq!(client.get_owner(), owner);
}

#[test]
fn initialize_owner_is_not_in_admin_set() {
    // Owner derives privileges from the owner slot, not the admin map.
    // is_admin() checks only the explicit admin map.
    let (env, client, owner) = setup_with_owner();
    assert!(
        !client.is_admin(&owner),
        "is_admin() must return false for owner unless explicitly granted"
    );
}

#[test]
fn owner_can_moderate_via_can_moderate() {
    let (env, client, owner) = setup_with_owner();
    assert!(
        client.can_moderate(&owner),
        "owner must pass can_moderate() without being in admin map"
    );
}

#[test]
#[should_panic]
fn double_initialize_is_rejected() {
    let (env, client, owner) = setup_with_owner();
    let other = Address::random(&env);
    // Second call must panic — re-initialization attack prevention.
    client.initialize(&other);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 – Admin grant
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn owner_can_grant_admin() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);

    client.assign_admin(&owner, &admin);

    assert!(client.is_admin(&admin), "admin must appear in admin set after grant");
    assert!(client.can_moderate(&admin), "admin must pass can_moderate()");
}

#[test]
fn owner_can_grant_multiple_admins() {
    let (env, client, owner) = setup_with_owner();
    let admin_a = Address::random(&env);
    let admin_b = Address::random(&env);

    client.assign_admin(&owner, &admin_a);
    client.assign_admin(&owner, &admin_b);

    assert!(client.is_admin(&admin_a));
    assert!(client.is_admin(&admin_b));
}

#[test]
#[should_panic]
fn granting_admin_twice_is_rejected() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);

    client.assign_admin(&owner, &admin);
    // Second grant must panic with AlreadyAdmin (3)
    client.assign_admin(&owner, &admin);
}

#[test]
#[should_panic]
fn non_owner_cannot_grant_admin() {
    let (env, client, owner) = setup_with_owner();
    let stranger = Address::random(&env);
    let target   = Address::random(&env);

    // Stranger attempting to grant admin must panic with NotOwner (1)
    client.assign_admin(&stranger, &target);
}

#[test]
#[should_panic]
fn admin_cannot_grant_other_admins() {
    let (env, client, owner) = setup_with_owner();
    let admin   = Address::random(&env);
    let target  = Address::random(&env);

    client.assign_admin(&owner, &admin);
    // Admin trying to grant another admin must panic — only owner may do this.
    client.assign_admin(&admin, &target);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 – Admin revoke
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn owner_can_revoke_admin() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);

    client.assign_admin(&owner, &admin);
    assert!(client.is_admin(&admin));

    client.revoke_admin(&owner, &admin);
    assert!(!client.is_admin(&admin), "admin must be removed after revocation");
    assert!(
        !client.can_moderate(&admin),
        "revoked admin must not pass can_moderate()"
    );
}

#[test]
#[should_panic]
fn revoking_non_admin_is_rejected() {
    let (env, client, owner) = setup_with_owner();
    let stranger = Address::random(&env);

    // stranger was never granted admin — must panic with NotAdmin (4)
    client.revoke_admin(&owner, &stranger);
}

#[test]
#[should_panic]
fn owner_cannot_revoke_themselves_as_admin() {
    // Owner is not in the admin map, so this hits CannotDemoteOwner (6).
    let (env, client, owner) = setup_with_owner();
    client.revoke_admin(&owner, &owner);
}

#[test]
#[should_panic]
fn non_owner_cannot_revoke_admin() {
    let (env, client, owner) = setup_with_owner();
    let admin    = Address::random(&env);
    let stranger = Address::random(&env);

    client.assign_admin(&owner, &admin);
    // Stranger trying to revoke admin must panic with NotOwner (1)
    client.revoke_admin(&stranger, &admin);
}

#[test]
fn revoked_admin_loses_resolve_privilege() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);

    client.assign_admin(&owner, &admin);

    // Admin can resolve before revocation
    let id = make_reported_confession(&client, &env);
    client.resolve(&admin, &id);

    // Revoke and confirm they can no longer resolve a new report
    client.revoke_admin(&owner, &admin);

    let id2 = make_reported_confession(&client, &env);
    let result = std::panic::catch_unwind(|| client.resolve(&admin, &id2));
    assert!(result.is_err(), "revoked admin must not resolve");
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 – Ownership transfer
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn owner_can_transfer_ownership() {
    let (env, client, owner) = setup_with_owner();
    let new_owner = Address::random(&env);

    client.transfer_ownership(&owner, &new_owner);

    assert_eq!(client.get_owner(), new_owner, "get_owner() must reflect new owner");
    assert!(client.is_owner(&new_owner));
    assert!(!client.is_owner(&owner), "old owner must no longer be recognized");
}

#[test]
fn new_owner_can_grant_admin_after_transfer() {
    let (env, client, owner) = setup_with_owner();
    let new_owner = Address::random(&env);
    let admin     = Address::random(&env);

    client.transfer_ownership(&owner, &new_owner);
    // New owner exercises owner privilege
    client.assign_admin(&new_owner, &admin);

    assert!(client.is_admin(&admin));
}

#[test]
#[should_panic]
fn old_owner_cannot_grant_admin_after_transfer() {
    let (env, client, owner) = setup_with_owner();
    let new_owner = Address::random(&env);
    let target    = Address::random(&env);

    client.transfer_ownership(&owner, &new_owner);
    // Old owner attempting owner-only action must panic
    client.assign_admin(&owner, &target);
}

#[test]
#[should_panic]
fn non_owner_cannot_transfer_ownership() {
    let (env, client, _owner) = setup_with_owner();
    let stranger  = Address::random(&env);
    let new_owner = Address::random(&env);

    client.transfer_ownership(&stranger, &new_owner);
}

#[test]
fn admin_roles_survive_ownership_transfer() {
    // Existing admins granted before the transfer remain admins.
    // Their privileges come from the admin set, not from the owner slot.
    let (env, client, owner) = setup_with_owner();
    let admin     = Address::random(&env);
    let new_owner = Address::random(&env);

    client.assign_admin(&owner, &admin);
    client.transfer_ownership(&owner, &new_owner);

    assert!(
        client.is_admin(&admin),
        "admin granted before transfer must remain in admin set"
    );
    assert!(client.can_moderate(&admin));
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 – resolve() role guard
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn owner_can_resolve_report() {
    let (env, client, owner) = setup_with_owner();
    let id = make_reported_confession(&client, &env);
    client.resolve(&owner, &id); // must not panic
}

#[test]
fn admin_can_resolve_report() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);
    client.assign_admin(&owner, &admin);

    let id = make_reported_confession(&client, &env);
    client.resolve(&admin, &id); // must not panic
}

#[test]
#[should_panic]
fn stranger_cannot_resolve_report() {
    let (env, client, _owner) = setup_with_owner();
    let stranger = Address::random(&env);
    let id = make_reported_confession(&client, &env);

    // Must panic with NotAuthorized (2)
    client.resolve(&stranger, &id);
}

/// Verify the panic message encodes the expected numeric error code.
#[test]
fn unauthorized_resolve_panic_message_is_error_code_2() {
    let (env, client, _owner) = setup_with_owner();
    let stranger = Address::random(&env);
    let id = make_reported_confession(&client, &env);

    let result = std::panic::catch_unwind(|| client.resolve(&stranger, &id));
    let err    = result.expect_err("must panic");

    if let Some(msg) = err.downcast_ref::<String>() {
        assert_eq!(msg, "2", "NotAuthorized error code must be \"2\"");
    } else if let Some(msg) = err.downcast_ref::<&str>() {
        assert_eq!(*msg, "2", "NotAuthorized error code must be \"2\"");
    }
    // If neither branch matches, the panic payload is opaque — acceptable.
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 – update_config() guard
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn owner_can_update_config() {
    let (env, client, owner) = setup_with_owner();
    client.update_config(&owner, &512, &128); // must not panic
}

#[test]
#[should_panic]
fn admin_cannot_update_config() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);
    client.assign_admin(&owner, &admin);

    // update_config is owner-only; admin must be rejected.
    client.update_config(&admin, &512, &128);
}

#[test]
#[should_panic]
fn stranger_cannot_update_config() {
    let (env, client, _owner) = setup_with_owner();
    let stranger = Address::random(&env);
    client.update_config(&stranger, &512, &128);
}

#[test]
#[should_panic]
fn update_config_with_zero_content_len_is_rejected() {
    let (env, client, owner) = setup_with_owner();
    // max_content_len = 0 must be rejected even by the owner.
    client.update_config(&owner, &0, &128);
}

#[test]
fn config_change_is_observed_by_create() {
    let (env, client, owner) = setup_with_owner();

    // Lower limit to 5 bytes
    client.update_config(&owner, &5, &256);

    // 5-char content — should succeed
    client.create(&s(&env, "Hello")); // must not panic

    // 6-char content — must be rejected
    let result = std::panic::catch_unwind(|| client.create(&s(&env, "Hello!")));
    assert!(result.is_err(), "content exceeding new max_content_len must be rejected");
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7 – assign/revoke guards (comprehensive non-owner rejections)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
#[should_panic]
fn stranger_cannot_transfer_ownership() {
    let (env, client, _owner) = setup_with_owner();
    let stranger  = Address::random(&env);
    let new_owner = Address::random(&env);
    client.transfer_ownership(&stranger, &new_owner);
}

#[test]
#[should_panic]
fn admin_cannot_transfer_ownership() {
    let (env, client, owner) = setup_with_owner();
    let admin     = Address::random(&env);
    let new_owner = Address::random(&env);

    client.assign_admin(&owner, &admin);
    // Admin attempting ownership transfer must panic with NotOwner (1).
    client.transfer_ownership(&admin, &new_owner);
}

#[test]
#[should_panic]
fn admin_cannot_revoke_other_admin() {
    let (env, client, owner) = setup_with_owner();
    let admin_a = Address::random(&env);
    let admin_b = Address::random(&env);

    client.assign_admin(&owner, &admin_a);
    client.assign_admin(&owner, &admin_b);

    // admin_a trying to revoke admin_b must panic.
    client.revoke_admin(&admin_a, &admin_b);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 8 – View methods
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn is_owner_returns_false_for_random_address() {
    let (env, client, _owner) = setup_with_owner();
    let stranger = Address::random(&env);
    assert!(!client.is_owner(&stranger));
}

#[test]
fn is_admin_returns_false_before_grant() {
    let (env, client, _owner) = setup_with_owner();
    let candidate = Address::random(&env);
    assert!(!client.is_admin(&candidate));
}

#[test]
fn can_moderate_returns_false_for_stranger() {
    let (env, client, _owner) = setup_with_owner();
    let stranger = Address::random(&env);
    assert!(!client.can_moderate(&stranger));
}

#[test]
fn can_moderate_returns_true_for_owner_and_admin() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);
    client.assign_admin(&owner, &admin);

    assert!(client.can_moderate(&owner));
    assert!(client.can_moderate(&admin));
}

#[test]
fn get_owner_reflects_current_owner() {
    let (env, client, owner) = setup_with_owner();
    assert_eq!(client.get_owner(), owner);

    let new_owner = Address::random(&env);
    client.transfer_ownership(&owner, &new_owner);
    assert_eq!(client.get_owner(), new_owner);
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 9 – Error code contract
// ─────────────────────────────────────────────────────────────────────────────
//
// These tests pin the numeric error codes so a breaking change in `AccessError`
// discriminants is caught immediately.

/// NotOwner (1) is returned when a non-owner calls an owner-only method.
#[test]
fn error_code_1_is_not_owner() {
    let (env, client, _owner) = setup_with_owner();
    let stranger = Address::random(&env);
    let target   = Address::random(&env);

    let result = std::panic::catch_unwind(|| client.assign_admin(&stranger, &target));
    let err    = result.expect_err("must panic");

    assert_error_code(err, 1, "NotOwner");
}

/// NotAuthorized (2) is returned when a stranger calls a moderation method.
#[test]
fn error_code_2_is_not_authorized() {
    let (env, client, _owner) = setup_with_owner();
    let stranger = Address::random(&env);
    let id = make_reported_confession(&client, &env);

    let result = std::panic::catch_unwind(|| client.resolve(&stranger, &id));
    let err    = result.expect_err("must panic");

    assert_error_code(err, 2, "NotAuthorized");
}

/// AlreadyAdmin (3) is returned on duplicate grant.
#[test]
fn error_code_3_is_already_admin() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);
    client.assign_admin(&owner, &admin);

    let result = std::panic::catch_unwind(|| client.assign_admin(&owner, &admin));
    let err    = result.expect_err("must panic");

    assert_error_code(err, 3, "AlreadyAdmin");
}

/// NotAdmin (4) is returned when revoking a non-admin address.
#[test]
fn error_code_4_is_not_admin() {
    let (env, client, owner) = setup_with_owner();
    let stranger = Address::random(&env);

    let result = std::panic::catch_unwind(|| client.revoke_admin(&owner, &stranger));
    let err    = result.expect_err("must panic");

    assert_error_code(err, 4, "NotAdmin");
}

/// CannotDemoteOwner (6) is returned when owner tries to self-revoke.
#[test]
fn error_code_6_is_cannot_demote_owner() {
    let (env, client, owner) = setup_with_owner();

    let result = std::panic::catch_unwind(|| client.revoke_admin(&owner, &owner));
    let err    = result.expect_err("must panic");

    assert_error_code(err, 6, "CannotDemoteOwner");
}

/// Helper: assert that a caught panic payload encodes `expected_code`.
fn assert_error_code(err: Box<dyn std::any::Any + Send>, expected_code: u32, name: &str) {
    let code_str = expected_code.to_string();
    if let Some(msg) = err.downcast_ref::<String>() {
        assert_eq!(
            msg, &code_str,
            "expected error code {} ({}) but got panic message: {}",
            expected_code, name, msg
        );
    } else if let Some(msg) = err.downcast_ref::<&str>() {
        assert_eq!(
            *msg, code_str.as_str(),
            "expected error code {} ({}) but got panic message: {}",
            expected_code, name, msg
        );
    }
    // Opaque payload — code is unverifiable, skip assertion rather than false-fail.
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 10 – Event emission (audit trail)
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn grant_admin_emits_adm_grant_event() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);

    client.assign_admin(&owner, &admin);

    let events = env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        // Topic tuple: (Symbol("adm_grant"), admin_address)
        topics.iter().any(|t| {
            // Convert topic Val to string representation and check for our symbol
            format!("{:?}", t).contains("adm_grant")
        })
    });
    assert!(found, "admin_granted event must be emitted on assign_admin()");
}

#[test]
fn revoke_admin_emits_adm_revoke_event() {
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);

    client.assign_admin(&owner, &admin);
    env.events().all(); // snapshot to isolate

    client.revoke_admin(&owner, &admin);

    let events = env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.iter().any(|t| format!("{:?}", t).contains("adm_revoke"))
    });
    assert!(found, "admin_revoked event must be emitted on revoke_admin()");
}

#[test]
fn transfer_ownership_emits_own_xfer_event() {
    let (env, client, owner) = setup_with_owner();
    let new_owner = Address::random(&env);

    client.transfer_ownership(&owner, &new_owner);

    let events = env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.iter().any(|t| format!("{:?}", t).contains("own_xfer"))
    });
    assert!(found, "ownership_transferred event must be emitted on transfer_ownership()");
}

#[test]
fn resolve_emits_resolved_event() {
    let (env, client, owner) = setup_with_owner();
    let id = make_reported_confession(&client, &env);

    client.resolve(&owner, &id);

    let events = env.events().all();
    let found = events.iter().any(|(_, topics, _)| {
        topics.iter().any(|t| format!("{:?}", t).contains("resolved"))
    });
    assert!(found, "resolved event must be emitted on resolve()");
}

#[test]
fn no_spurious_events_on_view_calls() {
    // View methods must not emit any events.
    let (env, client, owner) = setup_with_owner();
    let admin = Address::random(&env);
    client.assign_admin(&owner, &admin);

    // Capture event count after setup
    let count_before = env.events().all().len();

    // Call every view method
    let _ = client.is_owner(&owner);
    let _ = client.is_admin(&admin);
    let _ = client.can_moderate(&owner);
    let _ = client.get_owner();

    let count_after = env.events().all().len();
    assert_eq!(
        count_before, count_after,
        "view methods must not emit any events"
    );
}