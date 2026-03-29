/// Adversarial and boundary tests for the anonymous-tipping contract.
///
/// Uses the Soroban-generated `AnonymousTippingClient` (emitted by `#[contractimpl]`)
/// after registering the contract in the test sandbox. Because the crate uses
/// `#![no_std]`, `extern crate std;` is declared here so that `std::panic` and
/// `std::string` items are reachable inside this `#[cfg(test)]` submodule.
#[cfg(test)]
mod adversarial {
    extern crate std;

    use soroban_sdk::{testutils::Address as _, Address, Env, String as SorobanString};

    // The #[contractimpl] macro emits `AnonymousTippingClient<'_>` alongside
    // the contract struct at the crate root.
    use crate::{AnonymousTipping, AnonymousTippingClient};

    // ── helpers ──────────────────────────────────────────────────────────────

    fn setup() -> (Env, Address) {
        let env = Env::default();
        let contract_id = env.register_contract(None, AnonymousTipping);
        AnonymousTippingClient::new(&env, &contract_id).init();
        (env, contract_id)
    }

    fn mk_client<'a>(env: &'a Env, id: &'a Address) -> AnonymousTippingClient<'a> {
        AnonymousTippingClient::new(env, id)
    }

    fn meta(env: &Env, len: usize) -> SorobanString {
        SorobanString::from_str(env, &std::string::String::from("m").repeat(len))
    }

    // ── invalid amount — zero ─────────────────────────────────────────────────

    #[test]
    fn zero_amount_tip_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip(&recipient, &0i128);
        }));
        assert_panics(r, "tip amount must be positive");
    }

    // ── invalid amount — negative (table-driven) ──────────────────────────────

    #[test]
    fn negative_one_amount_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip(&recipient, &(-1i128));
        }));
        assert_panics(r, "tip amount must be positive");
    }

    #[test]
    fn negative_large_amount_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip(&recipient, &(-1_000_000i128));
        }));
        assert_panics(r, "tip amount must be positive");
    }

    #[test]
    fn i128_min_amount_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip(&recipient, &i128::MIN);
        }));
        assert_panics(r, "tip amount must be positive");
    }

    #[test]
    fn zero_amount_with_proof_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, 10);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip_with_proof(&recipient, &0i128, &Some(m.clone()));
        }));
        assert_panics(r, "tip amount must be positive");
    }

    #[test]
    fn negative_amount_with_proof_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, 10);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip_with_proof(&recipient, &(-42i128), &Some(m.clone()));
        }));
        assert_panics(r, "tip amount must be positive");
    }

    // ── proof metadata boundary table ─────────────────────────────────────────

    #[test]
    fn metadata_empty_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, 0);
        let sid = c.send_tip_with_proof(&recipient, &1i128, &Some(m));
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), 1);
    }

    #[test]
    fn metadata_64_bytes_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, 64);
        let sid = c.send_tip_with_proof(&recipient, &5i128, &Some(m));
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), 5);
    }

    #[test]
    fn metadata_127_bytes_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, 127);
        let sid = c.send_tip_with_proof(&recipient, &1i128, &Some(m));
        assert_eq!(sid, 1);
    }

    #[test]
    fn metadata_exactly_max_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, AnonymousTipping::MAX_PROOF_METADATA_LEN as usize);
        let sid = c.send_tip_with_proof(&recipient, &7i128, &Some(m));
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), 7);
    }

    #[test]
    fn metadata_max_plus_one_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(
            &env,
            (AnonymousTipping::MAX_PROOF_METADATA_LEN + 1) as usize,
        );
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip_with_proof(&recipient, &1i128, &Some(m.clone()));
        }));
        assert_panics(r, "proof metadata too long");
    }

    #[test]
    fn metadata_256_bytes_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, 256);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip_with_proof(&recipient, &1i128, &Some(m.clone()));
        }));
        assert_panics(r, "proof metadata too long");
    }

    #[test]
    fn metadata_extremely_large_rejected() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let m = meta(&env, 1024);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip_with_proof(&recipient, &1i128, &Some(m.clone()));
        }));
        assert_panics(r, "proof metadata too long");
    }

    // ── settlement ID monotonicity ────────────────────────────────────────────

    #[test]
    fn settlement_ids_are_monotonically_increasing() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let r1 = Address::generate(&env);
        let r2 = Address::generate(&env);

        let id1 = c.send_tip(&r1, &1i128);
        let id2 = c.send_tip(&r2, &1i128);
        let id3 = c.send_tip(&r1, &1i128);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
        assert_eq!(c.latest_settlement_nonce(), 3);
    }

    // ── same-recipient accumulation ───────────────────────────────────────────

    #[test]
    fn same_recipient_tips_accumulate() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);

        c.send_tip(&recipient, &10i128);
        c.send_tip(&recipient, &25i128);
        c.send_tip(&recipient, &5i128);

        assert_eq!(c.get_tips(&recipient), 40);
    }

    #[test]
    fn multiple_recipients_are_independent() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let r1 = Address::generate(&env);
        let r2 = Address::generate(&env);

        c.send_tip(&r1, &100i128);
        c.send_tip(&r2, &200i128);

        assert_eq!(c.get_tips(&r1), 100);
        assert_eq!(c.get_tips(&r2), 200);
    }

    // ── volume smoke: 10 sequential tips ─────────────────────────────────────

    #[test]
    fn ten_sequential_tips_nonce_matches_count() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        for i in 1_u64..=10 {
            let recipient = Address::generate(&env);
            let sid = c.send_tip(&recipient, &(i as i128));
            assert_eq!(sid, i);
        }
        assert_eq!(c.latest_settlement_nonce(), 10);
    }

    // ── init idempotency ──────────────────────────────────────────────────────

    #[test]
    fn double_init_is_safe() {
        let (env, id) = setup(); // already calls init once
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        c.send_tip(&recipient, &1i128);

        c.init(); // second init must not reset state

        assert_eq!(c.get_tips(&recipient), 1);
        assert_eq!(c.latest_settlement_nonce(), 1);
    }

    // ── send_tip vs send_tip_with_proof(None) equivalence ────────────────────

    #[test]
    fn send_tip_and_proof_none_produce_equal_totals() {
        let env = Env::default();
        let contract_id = env.register_contract(None, AnonymousTipping);
        let c = mk_client(&env, &contract_id);
        c.init();

        let r1 = Address::generate(&env);
        let r2 = Address::generate(&env);

        c.send_tip(&r1, &42i128);
        c.send_tip_with_proof(&r2, &42i128, &None);

        assert_eq!(c.get_tips(&r1), c.get_tips(&r2));
    }

    // ── uninitialised contract still works ───────────────────────────────────

    #[test]
    fn tip_without_explicit_init_still_succeeds() {
        let env = Env::default();
        let contract_id = env.register_contract(None, AnonymousTipping);
        let c = mk_client(&env, &contract_id);
        // No c.init() call — storage defaults to 0 via `unwrap_or`
        let recipient = Address::generate(&env);
        let sid = c.send_tip(&recipient, &3i128);
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), 3);
    }

    // ── unknown recipient returns zero ────────────────────────────────────────

    #[test]
    fn get_tips_returns_zero_for_unknown_recipient() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let unknown = Address::generate(&env);
        assert_eq!(c.get_tips(&unknown), 0);
    }

    // ── large and small valid amounts ─────────────────────────────────────────

    #[test]
    fn very_large_valid_amount_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let amount: i128 = 1_000_000_000_000;
        let sid = c.send_tip(&recipient, &amount);
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), amount);
    }

    #[test]
    fn minimum_valid_amount_one_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);
        let sid = c.send_tip(&recipient, &1i128);
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), 1);
    }

    // ── overflow edge cases ─────────────────────────────────────────────────────

    #[test]
    fn total_overflow_panics() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);

        // Send a tip that brings total to near max
        c.send_tip(&recipient, &(i128::MAX - 100));

        // Next tip should overflow
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip(&recipient, &200i128);
        }));
        assert_panics(r, "recipient tip total overflow");
    }

    #[test]
    fn nonce_overflow_panics() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);

        // Simulate reaching near max nonce by setting it manually
        env.as_contract(&id, || {
            env.storage()
                .instance()
                .set(&crate::DataKey::SettlementNonce, &u64::MAX);
        });

        // Next tip should overflow nonce
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            c.send_tip(&recipient, &1i128);
        }));
        assert_panics(r, "settlement nonce overflow");
    }

    // ── metadata edge cases ───────────────────────────────────────────────────

    #[test]
    fn metadata_unicode_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);

        // Test with Unicode characters (emoji, Chinese, etc.)
        let unicode_str = "🚀💰测试🔥";
        let metadata = SorobanString::from_str(&env, unicode_str);

        let sid = c.send_tip_with_proof(&recipient, &5i128, &Some(metadata));
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), 5);
    }

    #[test]
    fn metadata_whitespace_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);

        // Test with various whitespace characters
        let whitespace_str = " \t\n\r ";
        let metadata = SorobanString::from_str(&env, whitespace_str);

        let sid = c.send_tip_with_proof(&recipient, &3i128, &Some(metadata));
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), 3);
    }

    // ── amount precision tests ───────────────────────────────────────────────────

    #[test]
    fn max_valid_amount_succeeds() {
        let (env, id) = setup();
        let c = mk_client(&env, &id);
        let recipient = Address::generate(&env);

        // Test with maximum valid amount (less than would cause overflow)
        let max_amount = i128::MAX / 2;
        let sid = c.send_tip(&recipient, &max_amount);
        assert_eq!(sid, 1);
        assert_eq!(c.get_tips(&recipient), max_amount);
    }
}
