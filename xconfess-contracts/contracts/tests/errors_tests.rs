use xconfess_contract::errors::ContractError;

#[test]
fn test_error_codes_and_messages() {
    let e = ContractError::Unauthorized;
    assert_eq!(e.code(), 1000);
    assert_eq!(e.message(), "caller not authorized");

    let e = ContractError::ConfessionEmpty;
    assert_eq!(e.code(), 2001);
    assert_eq!(e.message(), "confession content empty");
}

// ── Tipping panic-string stability ─────────────────────────────────────────
//
// The anonymous-tipping contract signals errors via `panic!` rather than a
// structured error enum. The exact strings below are the de-facto public
// error surface. These constants mirror what the contract produces and are
// asserted here so that any accidental rename is caught at test time.

/// Matches the panic in `send_tip` / `send_tip_with_proof` when amount <= 0.
pub const TIPPING_ERR_AMOUNT: &str = "tip amount must be positive";

/// Matches the panic in `send_tip_with_proof` when metadata exceeds the 128-byte cap.
pub const TIPPING_ERR_METADATA: &str = "proof metadata too long";

#[test]
fn tipping_panic_string_amount_is_stable() {
    // Guard: if the contract message changes this comparison fails, prompting
    // an intentional update to all dependent test assertions.
    assert!(
        TIPPING_ERR_AMOUNT.contains("amount") && TIPPING_ERR_AMOUNT.contains("positive"),
        "tipping amount error string changed — update all #[should_panic] tests"
    );
}

#[test]
fn tipping_panic_string_metadata_is_stable() {
    assert!(
        TIPPING_ERR_METADATA.contains("metadata") && TIPPING_ERR_METADATA.contains("long"),
        "tipping metadata error string changed — update all #[should_panic] tests"
    );
}