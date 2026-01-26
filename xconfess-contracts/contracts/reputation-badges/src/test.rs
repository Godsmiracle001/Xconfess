use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_mint_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Mint a badge
    let badge_id = client.mint_badge(&user, &BadgeType::ConfessionStarter);
    assert_eq!(badge_id, 1);

    // Verify badge count
    let count = client.get_badge_count(&user);
    assert_eq!(count, 1);

    // Verify has_badge
    assert!(client.has_badge(&user, &BadgeType::ConfessionStarter));
    assert!(!client.has_badge(&user, &BadgeType::PopularVoice));
}

#[test]
fn test_duplicate_badge_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Mint first badge
    let badge_id1 = client.mint_badge(&user, &BadgeType::ConfessionStarter);
    assert_eq!(badge_id1, 1);

    // Verify count stays at 1
    let count = client.get_badge_count(&user);
    assert_eq!(count, 1);
}

#[test]
fn test_multiple_badge_types() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Mint different badge types
    client.mint_badge(&user, &BadgeType::ConfessionStarter);
    client.mint_badge(&user, &BadgeType::PopularVoice);
    client.mint_badge(&user, &BadgeType::GenerousSoul);

    // Verify count
    let count = client.get_badge_count(&user);
    assert_eq!(count, 3);

    // Verify all badges
    assert!(client.has_badge(&user, &BadgeType::ConfessionStarter));
    assert!(client.has_badge(&user, &BadgeType::PopularVoice));
    assert!(client.has_badge(&user, &BadgeType::GenerousSoul));
    assert!(!client.has_badge(&user, &BadgeType::CommunityHero));
}

#[test]
fn test_get_badges() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Mint badges
    client.mint_badge(&user, &BadgeType::ConfessionStarter);
    client.mint_badge(&user, &BadgeType::TopReactor);

    // Get all badges
    let badges = client.get_badges(&user);
    assert_eq!(badges.len(), 2);
}

#[test]
fn test_transfer_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // Mint badge to user1
    let badge_id = client.mint_badge(&user1, &BadgeType::ConfessionStarter);

    // Transfer to user2
    client.transfer_badge(&badge_id, &user2);

    // Verify ownership changed
    assert!(!client.has_badge(&user1, &BadgeType::ConfessionStarter));
    assert!(client.has_badge(&user2, &BadgeType::ConfessionStarter));

    assert_eq!(client.get_badge_count(&user1), 0);
    assert_eq!(client.get_badge_count(&user2), 1);
}

#[test]
fn test_get_total_badges() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // Mint badges
    client.mint_badge(&user1, &BadgeType::ConfessionStarter);
    client.mint_badge(&user2, &BadgeType::PopularVoice);
    client.mint_badge(&user1, &BadgeType::GenerousSoul);

    // Verify total
    let total = client.get_total_badges();
    assert_eq!(total, 3);
}

#[test]
fn test_get_badge_by_id() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // Mint badge
    let badge_id = client.mint_badge(&user, &BadgeType::CommunityHero);

    // Get badge by ID
    let badge = client.get_badge(&badge_id);
    assert!(badge.is_some());

    let badge = badge.unwrap();
    assert_eq!(badge.id, badge_id);
    assert_eq!(badge.badge_type, BadgeType::CommunityHero);
    assert_eq!(badge.owner, user);
}

#[test]
fn test_nonexistent_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    // Try to get non-existent badge
    let badge = client.get_badge(&999);
    assert!(badge.is_none());
}

#[test]
fn test_transfer_nonexistent_badge() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ReputationBadges, ());
    let client = ReputationBadgesClient::new(&env, &contract_id);

    let _user = Address::generate(&env);

    // Verify no badge exists
    let badge = client.get_badge(&999);
    assert!(badge.is_none());
}
