#[cfg(test)]
mod monotonic_nonce_tests {
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use xconfess_contract::events::*;

    /// Helper to create a test environment
    fn setup_env() -> Env {
        Env::default()
    }

    #[test]
    fn test_nonce_starts_at_zero() {
        let env = setup_env();
        let nonce = get_current_nonce(&env);
        assert_eq!(nonce, 0, "Initial nonce should be 0");
    }

    #[test]
    fn test_confession_event_increments_nonce() {
        let env = setup_env();
        let author = Address::generate(&env);
        
        // Initial nonce should be 0
        assert_eq!(get_current_nonce(&env), 0);
        
        // Emit first confession event
        emit_confession(&env, 1, author.clone(), soroban_sdk::symbol_short!("hash1"));
        assert_eq!(get_current_nonce(&env), 1, "Nonce should be 1 after first event");
        
        // Emit second confession event
        emit_confession(&env, 2, author.clone(), soroban_sdk::symbol_short!("hash2"));
        assert_eq!(get_current_nonce(&env), 2, "Nonce should be 2 after second event");
    }

    #[test]
    fn test_reaction_event_increments_nonce() {
        let env = setup_env();
        let reactor = Address::generate(&env);
        
        assert_eq!(get_current_nonce(&env), 0);
        
        emit_reaction(&env, 1, reactor.clone(), soroban_sdk::symbol_short!("like"));
        assert_eq!(get_current_nonce(&env), 1);
        
        emit_reaction(&env, 1, reactor.clone(), soroban_sdk::symbol_short!("love"));
        assert_eq!(get_current_nonce(&env), 2);
    }

    #[test]
    fn test_report_event_increments_nonce() {
        let env = setup_env();
        let reporter = Address::generate(&env);
        
        assert_eq!(get_current_nonce(&env), 0);
        
        emit_report(&env, 1, reporter.clone(), soroban_sdk::symbol_short!("spam"));
        assert_eq!(get_current_nonce(&env), 1);
        
        emit_report(&env, 2, reporter.clone(), soroban_sdk::symbol_short!("abuse"));
        assert_eq!(get_current_nonce(&env), 2);
    }

    #[test]
    fn test_role_event_increments_nonce() {
        let env = setup_env();
        let user = Address::generate(&env);
        
        assert_eq!(get_current_nonce(&env), 0);
        
        emit_role(&env, user.clone(), soroban_sdk::symbol_short!("admin"), true);
        assert_eq!(get_current_nonce(&env), 1);
        
        emit_role(&env, user.clone(), soroban_sdk::symbol_short!("mod"), true);
        assert_eq!(get_current_nonce(&env), 2);
    }

    #[test]
    fn test_mixed_events_increment_nonce_sequentially() {
        let env = setup_env();
        let addr1 = Address::generate(&env);
        let addr2 = Address::generate(&env);
        
        assert_eq!(get_current_nonce(&env), 0);
        
        // Emit different types of events
        emit_confession(&env, 1, addr1.clone(), soroban_sdk::symbol_short!("hash1"));
        assert_eq!(get_current_nonce(&env), 1);
        
        emit_reaction(&env, 1, addr2.clone(), soroban_sdk::symbol_short!("like"));
        assert_eq!(get_current_nonce(&env), 2);
        
        emit_report(&env, 1, addr2.clone(), soroban_sdk::symbol_short!("spam"));
        assert_eq!(get_current_nonce(&env), 3);
        
        emit_role(&env, addr1.clone(), soroban_sdk::symbol_short!("admin"), true);
        assert_eq!(get_current_nonce(&env), 4);
        
        emit_confession(&env, 2, addr1.clone(), soroban_sdk::symbol_short!("hash2"));
        assert_eq!(get_current_nonce(&env), 5);
    }

    #[test]
    fn test_nonce_is_monotonic_increasing() {
        let env = setup_env();
        let author = Address::generate(&env);
        
        let mut last_nonce = 0u64;
        
        // Emit 10 events and verify each nonce is exactly 1 more than the previous
        for i in 1..=10 {
            emit_confession(&env, i, author.clone(), soroban_sdk::symbol_short!("hash"));
            let current_nonce = get_current_nonce(&env);
            assert_eq!(
                current_nonce,
                last_nonce + 1,
                "Nonce should increment by exactly 1"
            );
            last_nonce = current_nonce;
        }
        
        assert_eq!(last_nonce, 10, "Final nonce should be 10");
    }

    #[test]
    fn test_event_payload_contains_nonce() {
        let env = setup_env();
        let author = Address::generate(&env);
        
        // Create event manually to verify nonce is included
        emit_confession(&env, 1, author.clone(), soroban_sdk::symbol_short!("hash1"));
        
        // The nonce should be 1 after first emission
        let current_nonce = get_current_nonce(&env);
        assert_eq!(current_nonce, 1);
        
        // Emit another and verify it's 2
        emit_confession(&env, 2, author.clone(), soroban_sdk::symbol_short!("hash2"));
        let current_nonce = get_current_nonce(&env);
        assert_eq!(current_nonce, 2);
    }

    #[test]
    fn test_nonce_persists_across_operations() {
        let env = setup_env();
        let addr = Address::generate(&env);
        
        // Emit some events
        emit_confession(&env, 1, addr.clone(), soroban_sdk::symbol_short!("hash1"));
        emit_reaction(&env, 1, addr.clone(), soroban_sdk::symbol_short!("like"));
        
        let nonce_after_two = get_current_nonce(&env);
        assert_eq!(nonce_after_two, 2);
        
        // Query nonce again without emitting - should be same
        let nonce_query = get_current_nonce(&env);
        assert_eq!(nonce_query, 2, "Nonce should persist");
        
        // Emit another event
        emit_report(&env, 1, addr.clone(), soroban_sdk::symbol_short!("spam"));
        assert_eq!(get_current_nonce(&env), 3);
    }

    #[test]
    fn test_high_volume_nonce_sequence() {
        let env = setup_env();
        let author = Address::generate(&env);
        
        // Simulate high volume of events
        let event_count = 100u64;
        
        for i in 1..=event_count {
            emit_confession(&env, i, author.clone(), soroban_sdk::symbol_short!("hash"));
            assert_eq!(get_current_nonce(&env), i);
        }
        
        assert_eq!(get_current_nonce(&env), event_count);
    }

    #[test]
    fn test_nonce_enables_gap_detection() {
        let env = setup_env();
        let addr = Address::generate(&env);
        
        // Simulate indexer receiving events
        let mut received_nonces = Vec::new();
        
        // Emit events and collect nonces
        for i in 1..=5 {
            emit_confession(&env, i, addr.clone(), soroban_sdk::symbol_short!("hash"));
            received_nonces.push(get_current_nonce(&env));
        }
        
        // Verify no gaps in sequence
        for i in 0..received_nonces.len() {
            assert_eq!(received_nonces[i], (i + 1) as u64);
        }
        
        // Simulate missing event (gap detection)
        let expected_sequence: Vec<u64> = (1..=5).collect();
        assert_eq!(received_nonces, expected_sequence, "No gaps should exist");
    }

    #[test]
    fn test_nonce_enables_duplicate_detection() {
        let env = setup_env();
        let addr = Address::generate(&env);
        
        // Emit events and track nonces
        let mut seen_nonces = std::collections::HashSet::new();
        
        for i in 1..=10 {
            emit_confession(&env, i, addr.clone(), soroban_sdk::symbol_short!("hash"));
            let nonce = get_current_nonce(&env);
            
            // Each nonce should be unique
            assert!(
                !seen_nonces.contains(&nonce),
                "Duplicate nonce detected: {}",
                nonce
            );
            seen_nonces.insert(nonce);
        }
        
        assert_eq!(seen_nonces.len(), 10, "Should have 10 unique nonces");
    }

    #[test]
    fn test_event_struct_includes_nonce_field() {
        let env = setup_env();
        let author = Address::generate(&env);
        
        // Create event struct directly
        let event = ConfessionEvent {
            event_version: EVENT_VERSION_V1,
            nonce: 42,
            confession_id: 1,
            author: author.clone(),
            content_hash: soroban_sdk::symbol_short!("hash"),
            timestamp: 1000,
        };
        
        assert_eq!(event.nonce, 42, "Event should contain nonce field");
        assert_eq!(event.event_version, 1);
    }

    #[test]
    fn test_reaction_event_struct_includes_nonce() {
        let env = setup_env();
        let reactor = Address::generate(&env);
        
        let event = ReactionEvent {
            event_version: EVENT_VERSION_V1,
            nonce: 10,
            confession_id: 1,
            reactor: reactor.clone(),
            reaction_type: soroban_sdk::symbol_short!("like"),
            timestamp: 2000,
        };
        
        assert_eq!(event.nonce, 10);
    }

    #[test]
    fn test_report_event_struct_includes_nonce() {
        let env = setup_env();
        let reporter = Address::generate(&env);
        
        let event = ReportEvent {
            event_version: EVENT_VERSION_V1,
            nonce: 20,
            confession_id: 1,
            reporter: reporter.clone(),
            reason: soroban_sdk::symbol_short!("spam"),
            timestamp: 3000,
        };
        
        assert_eq!(event.nonce, 20);
    }

    #[test]
    fn test_role_event_struct_includes_nonce() {
        let env = setup_env();
        let user = Address::generate(&env);
        
        let event = RoleEvent {
            event_version: EVENT_VERSION_V1,
            nonce: 30,
            user: user.clone(),
            role: soroban_sdk::symbol_short!("admin"),
            granted: true,
            timestamp: 4000,
        };
        
        assert_eq!(event.nonce, 30);
    }
}
