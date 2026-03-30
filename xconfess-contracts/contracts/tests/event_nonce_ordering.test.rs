use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};
use xconfess_contract::events::{
    emit_confession, emit_reaction, emit_report, emit_role, latest_confession_nonce,
    latest_governance_nonce, latest_reaction_nonce, latest_report_nonce, latest_role_nonce,
    next_governance_nonce,
};

#[test]
fn confession_nonce_increments_by_one_per_entity_stream() {
    let env = Env::default();
    let author = Address::generate(&env);

    emit_confession(
        &env,
        42,
        author.clone(),
        symbol_short!("hash_a"),
        None,
    );
    emit_confession(
        &env,
        42,
        author,
        symbol_short!("hash_b"),
        None,
    );

    assert_eq!(latest_confession_nonce(&env, 42), 2);
}

#[test]
fn reaction_report_and_role_nonces_are_monotonic_and_independent() {
    let env = Env::default();
    let actor = Address::generate(&env);

    emit_reaction(&env, 7, actor.clone(), symbol_short!("like"), None);
    emit_reaction(&env, 7, actor.clone(), symbol_short!("love"), None);
    emit_report(&env, 7, actor.clone(), symbol_short!("spam"), None);
    emit_report(&env, 7, actor.clone(), symbol_short!("abuse"), None);
    emit_role(
        &env,
        actor.clone(),
        symbol_short!("admin"),
        true,
        None,
    );
    emit_role(
        &env,
        actor.clone(),
        symbol_short!("admin"),
        false,
        None,
    );

    assert_eq!(latest_reaction_nonce(&env, 7), 2);
    assert_eq!(latest_report_nonce(&env, 7), 2);
    assert_eq!(latest_role_nonce(&env, actor, symbol_short!("admin")), 2);
}

#[test]
fn governance_nonce_is_monotonic_per_stream_symbol() {
    let env = Env::default();

    let stream = symbol_short!("gov_acc");
    assert_eq!(latest_governance_nonce(&env, stream.clone()), 0);
    assert_eq!(next_governance_nonce(&env, stream.clone()), 1);
    assert_eq!(next_governance_nonce(&env, stream.clone()), 2);
    assert_eq!(latest_governance_nonce(&env, stream), 2);
}

#[test]
fn nonce_sequence_supports_gap_duplicate_and_order_checks() {
    // Simulated ingestion stream from an indexer consumer.
    let observed = [1_u64, 2, 2, 4, 3, 5];

    let mut expected_next = 1_u64;
    let mut gaps = 0_u64;
    let mut duplicates = 0_u64;
    let mut out_of_order = 0_u64;

    for nonce in observed {
        if nonce == expected_next {
            expected_next += 1;
        } else if nonce < expected_next {
            // Already seen this nonce or sequence moved past it.
            if nonce + 1 == expected_next {
                duplicates += 1;
            } else {
                out_of_order += 1;
            }
        } else {
            // Missing range [expected_next, nonce)
            gaps += nonce - expected_next;
            expected_next = nonce + 1;
        }
    }

    assert_eq!(gaps, 1); // missing nonce = 3 before seeing 4
    assert_eq!(duplicates, 1); // duplicate nonce = 2
    assert_eq!(out_of_order, 1); // late arrival nonce = 3 after 4
}
