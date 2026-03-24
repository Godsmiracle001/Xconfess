use soroban_sdk::{Env, String as SorobanString};
use xconfess_contract::pagination::confession::{create, MAX_CONFESSION_CONTENT_LEN};
use anonymous_tipping::AnonymousTipping;
use soroban_sdk::testutils::Address as _;

#[test]
fn confession_content_exact_limit_succeeds() {
    let env = Env::default();
    let content = SorobanString::from_str(
        &env,
        &"a".repeat(MAX_CONFESSION_CONTENT_LEN as usize),
    );

    let id = create(&env, content);
    assert_eq!(id, 1);
}

#[test]
#[should_panic(expected = "confession content too long")]
fn confession_content_limit_plus_one_rejected() {
    let env = Env::default();
    let content = SorobanString::from_str(
        &env,
        &"a".repeat((MAX_CONFESSION_CONTENT_LEN + 1) as usize),
    );

    let _ = create(&env, content);
}

#[test]
fn settlement_proof_metadata_exact_limit_succeeds() {
    let env = Env::default();
    let recipient = soroban_sdk::Address::generate(&env);
    AnonymousTipping::init(env.clone());

    let metadata = SorobanString::from_str(
        &env,
        &"p".repeat(AnonymousTipping::MAX_PROOF_METADATA_LEN as usize),
    );
    let settlement_id = AnonymousTipping::send_tip_with_proof(
        env.clone(),
        recipient.clone(),
        10,
        Some(metadata),
    );

    assert_eq!(settlement_id, 1);
    assert_eq!(AnonymousTipping::get_tips(env, recipient), 10);
}

#[test]
#[should_panic(expected = "proof metadata too long")]
fn settlement_proof_metadata_limit_plus_one_rejected() {
    let env = Env::default();
    let recipient = soroban_sdk::Address::generate(&env);
    AnonymousTipping::init(env.clone());

    let metadata = SorobanString::from_str(
        &env,
        &"p".repeat((AnonymousTipping::MAX_PROOF_METADATA_LEN + 1) as usize),
    );

    let _ = AnonymousTipping::send_tip_with_proof(env, recipient, 10, Some(metadata));
}
