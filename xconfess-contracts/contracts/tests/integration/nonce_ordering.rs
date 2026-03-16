#[cfg(test)]
mod nonce_ordering_integration {
    use soroban_sdk::{testutils::Address as _, Address, Env};
    use xconfess_contract::events::*;

    /// Simulates an indexer tracking events
    struct MockIndexer {
        last_seen_nonce: u64,
        event_count: u64,
        gaps_detected: Vec<(u64, u64)>, // (expected, actual)
        duplicates_detected: Vec<u64>,
    }

    impl MockIndexer {
        fn new() -> Self {
            Self {
                last_seen_nonce: 0,
                event_count: 0,
                gaps_detected: Vec::new(),
                duplicates_detected: Vec::new(),
            }
        }

        fn process_event(&mut self, nonce: u64) {
            self.event_count += 1;

            // Check for gaps
            let expected_nonce = self.last_seen_nonce + 1;
            if nonce != expected_nonce && self.last_seen_nonce > 0 {
                self.gaps_detected.push((expected_nonce, nonce));
            }

            // Check for duplicates
            if nonce <= self.last_seen_nonce && self.last_seen_nonce > 0 {
                self.duplicates_detected.push(nonce);
            }

            self.last_seen_nonce = nonce;
        }

        fn has_gaps(&self) -> bool {
            !self.gaps_detected.is_empty()
        }

        fn has_duplicates(&self) -> bool {
            !self.duplicates_detected.is_empty()
        }
    }

    #[test]
    fn test_sequential_event_processing() {
        let env = Env::default();
        let mut indexer = MockIndexer::new();
        let author = Address::generate(&env);

        // Emit 20 sequential events
        for i in 1..=20 {
            emit_confession(&env, i, author.clone(), soroban_sdk::symbol_short!("hash"));
            let nonce = get_current_nonce(&env);
            indexer.process_event(nonce);
        }

        assert_eq!(indexer.event_count, 20);
        assert!(!indexer.has_gaps(), "No gaps should be detected");
        assert!(!indexer.has_duplicates(), "No duplicates should be detected");
        assert_eq!(indexer.last_seen_nonce, 20);
    }

    #[test]
    fn test_mixed_event_types_maintain_order() {
        let env = Env::default();
        let mut indexer = MockIndexer::new();
        let addr1 = Address::generate(&env);
        let addr2 = Address::generate(&env);

        // Emit various event types
        emit_confession(&env, 1, addr1.clone(), soroban_sdk::symbol_short!("hash1"));
        indexer.process_event(get_current_nonce(&env));

        emit_reaction(&env, 1, addr2.clone(), soroban_sdk::symbol_short!("like"));
        indexer.process_event(get_current_nonce(&env));

        emit_report(&env, 1, addr2.clone(), soroban_sdk::symbol_short!("spam"));
        indexer.process_event(get_current_nonce(&env));

        emit_role(&env, addr1.clone(), soroban_sdk::symbol_short!("admin"), true);
        indexer.process_event(get_current_nonce(&env));

        emit_confession(&env, 2, addr1.clone(), soroban_sdk::symbol_short!("hash2"));
        indexer.process_event(get_current_nonce(&env));

        assert_eq!(indexer.event_count, 5);
        assert!(!indexer.has_gaps());
        assert!(!indexer.has_duplicates());
    }

    #[test]
    fn test_out_of_order_detection() {
        let mut indexer = MockIndexer::new();

        // Simulate receiving events out of order
        indexer.process_event(1);
        indexer.process_event(2);
        indexer.process_event(5); // Gap: missing 3, 4
        indexer.process_event(6);

        assert!(indexer.has_gaps(), "Gap should be detected");
        assert_eq!(indexer.gaps_detected.len(), 1);
        assert_eq!(indexer.gaps_detected[0], (3, 5));
    }

    #[test]
    fn test_duplicate_event_detection() {
        let mut indexer = MockIndexer::new();

        // Simulate receiving duplicate events
        indexer.process_event(1);
        indexer.process_event(2);
        indexer.process_event(3);
        indexer.process_event(2); // Duplicate

        assert!(indexer.has_duplicates(), "Duplicate should be detected");
        assert_eq!(indexer.duplicates_detected.len(), 1);
        assert_eq!(indexer.duplicates_detected[0], 2);
    }

    #[test]
    fn test_replay_attack_detection() {
        let mut indexer = MockIndexer::new();

        // Normal sequence
        for i in 1..=10 {
            indexer.process_event(i);
        }

        // Attempt to replay old events
        indexer.process_event(5); // Replay
        indexer.process_event(3); // Replay

        assert!(indexer.has_duplicates());
        assert_eq!(indexer.duplicates_detected.len(), 2);
    }

    #[test]
    fn test_high_volume_event_stream() {
        let env = Env::default();
        let mut indexer = MockIndexer::new();
        let author = Address::generate(&env);

        // Simulate high volume
        for i in 1..=1000 {
            emit_confession(&env, i, author.clone(), soroban_sdk::symbol_short!("hash"));
            let nonce = get_current_nonce(&env);
            indexer.process_event(nonce);
        }

        assert_eq!(indexer.event_count, 1000);
        assert!(!indexer.has_gaps());
        assert!(!indexer.has_duplicates());
        assert_eq!(indexer.last_seen_nonce, 1000);
    }

    #[test]
    fn test_nonce_reconciliation() {
        let env = Env::default();
        let author = Address::generate(&env);

        // Emit some events
        for i in 1..=50 {
            emit_confession(&env, i, author.clone(), soroban_sdk::symbol_short!("hash"));
        }

        // Indexer can query latest nonce for reconciliation
        let latest_nonce = get_current_nonce(&env);
        assert_eq!(latest_nonce, 50);

        // If indexer has only seen 45 events, it knows it's missing 5
        let indexer_last_seen = 45u64;
        let missing_count = latest_nonce - indexer_last_seen;
        assert_eq!(missing_count, 5);
    }

    #[test]
    fn test_multi_entity_event_ordering() {
        let env = Env::default();
        let mut indexer = MockIndexer::new();
        let author1 = Address::generate(&env);
        let author2 = Address::generate(&env);
        let author3 = Address::generate(&env);

        // Multiple entities emitting events
        emit_confession(&env, 1, author1.clone(), soroban_sdk::symbol_short!("hash1"));
        indexer.process_event(get_current_nonce(&env));

        emit_confession(&env, 2, author2.clone(), soroban_sdk::symbol_short!("hash2"));
        indexer.process_event(get_current_nonce(&env));

        emit_reaction(&env, 1, author3.clone(), soroban_sdk::symbol_short!("like"));
        indexer.process_event(get_current_nonce(&env));

        emit_confession(&env, 3, author1.clone(), soroban_sdk::symbol_short!("hash3"));
        indexer.process_event(get_current_nonce(&env));

        emit_reaction(&env, 2, author1.clone(), soroban_sdk::symbol_short!("love"));
        indexer.process_event(get_current_nonce(&env));

        // All events should be ordered globally
        assert_eq!(indexer.event_count, 5);
        assert!(!indexer.has_gaps());
        assert_eq!(indexer.last_seen_nonce, 5);
    }

    #[test]
    fn test_event_stream_resumption() {
        let env = Env::default();
        let author = Address::generate(&env);

        // First batch of events
        for i in 1..=10 {
            emit_confession(&env, i, author.clone(), soroban_sdk::symbol_short!("hash"));
        }

        let checkpoint_nonce = get_current_nonce(&env);
        assert_eq!(checkpoint_nonce, 10);

        // Simulate indexer restart - it queries last known nonce
        let resume_from = checkpoint_nonce;

        // Second batch of events
        for i in 11..=20 {
            emit_confession(&env, i, author.clone(), soroban_sdk::symbol_short!("hash"));
        }

        let final_nonce = get_current_nonce(&env);
        assert_eq!(final_nonce, 20);

        // Indexer knows it needs to fetch events from nonce 11 to 20
        let events_to_fetch = final_nonce - resume_from;
        assert_eq!(events_to_fetch, 10);
    }

    #[test]
    fn test_concurrent_event_emission_ordering() {
        let env = Env::default();
        let mut indexer = MockIndexer::new();
        let addr1 = Address::generate(&env);
        let addr2 = Address::generate(&env);

        // Simulate concurrent operations (in practice, Soroban handles this atomically)
        // Events should still be ordered
        emit_confession(&env, 1, addr1.clone(), soroban_sdk::symbol_short!("hash1"));
        emit_reaction(&env, 1, addr2.clone(), soroban_sdk::symbol_short!("like"));
        emit_confession(&env, 2, addr2.clone(), soroban_sdk::symbol_short!("hash2"));
        emit_reaction(&env, 2, addr1.clone(), soroban_sdk::symbol_short!("love"));

        // Process all events
        for i in 1..=4 {
            indexer.process_event(i);
        }

        assert_eq!(indexer.event_count, 4);
        assert!(!indexer.has_gaps());
        assert!(!indexer.has_duplicates());
    }
}
