#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String, Symbol, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    BadgeAlreadyOwned = 1,
    BadgeNotFound = 2,
    BadgeTypeAlreadyOwned = 3,
    NotAuthorized = 4,
    NotInitialized = 5,
    BadgeTypeMetadataNotFound = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BadgeType {
    ConfessionStarter, // First confession posted
    PopularVoice,      // 100+ reactions received
    GenerousSoul,      // Tipped 10+ confessions
    CommunityHero,     // 50+ confessions posted
    TopReactor,        // 500+ reactions given
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeTypeMetadata {
    pub name: String,
    pub description: String,
    pub criteria: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Badge {
    pub id: u64,
    pub badge_type: BadgeType,
    pub minted_at: u64,
    pub owner: Address,
}

/// Storage keys
#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    /// Total badge count
    BadgeCount,
    /// Badge by ID: StorageKey::Badge(badge_id) -> Badge
    Badge(u64),
    /// User's badges: StorageKey::UserBadges(owner) -> Vec<u64>
    UserBadges(Address),
    /// Badge type ownership: StorageKey::TypeOwnership(owner, badge_type) -> bool
    TypeOwnership(Address, BadgeType),
    /// Admin address
    Admin,
    /// Badge type metadata: StorageKey::BadgeTypeMetadata(badge_type) -> BadgeTypeMetadata
    BadgeTypeMetadata(BadgeType),
    /// User reputation: StorageKey::UserReputation(user) -> i128
    UserReputation(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BadgeAction {
    Grant,
    Revoke,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeEvent {
    pub event_version: u32,
    pub badge_id: u64,
    pub badge_type: u32,
    pub owner: Address,
    pub action: BadgeAction,
    pub timestamp: u64,
}

/// Event data for badge transfer
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeTransferredData {
    pub badge_id: u64,
    pub from: Address,
    pub to: Address,
}

/// Event data for reputation adjustment
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReputationAdjustedData {
    pub user: Address,
    pub amount: i128,
    pub reason: String,
    pub timestamp: u64,
}

#[contract]
pub struct ReputationBadges;

// Helper functions
fn get_admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .persistent()
        .get(&StorageKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn is_authorized(env: &Env, caller: &Address) -> Result<bool, Error> {
    let admin = get_admin(env)?;
    Ok(admin == *caller)
}

#[contractimpl]
impl ReputationBadges {
    /// Initialize the contract with an admin
    /// Must be called exactly once during contract deployment
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().persistent().has(&StorageKey::Admin) {
            return Err(Error::NotInitialized); // Already initialized
        }

        admin.require_auth();
        env.storage().persistent().set(&StorageKey::Admin, &admin);

        let event_topic = Symbol::new(&env, "contract_initialized");
        env.events().publish((event_topic, admin.clone()), admin);

        Ok(())
    }

    /// Get the current admin address
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        get_admin(&env)
    }

    /// Transfer admin rights to a new address
    pub fn transfer_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let current_admin = get_admin(&env)?;
        current_admin.require_auth();

        new_admin.require_auth();
        env.storage().persistent().set(&StorageKey::Admin, &new_admin);

        let event_topic = Symbol::new(&env, "admin_transferred");
        env.events()
            .publish((event_topic, current_admin.clone()), (current_admin, new_admin.clone()));

        Ok(())
    }

    /// Create or update metadata for a badge type (admin only)
    pub fn create_badge(
        env: Env,
        badge_type: BadgeType,
        name: String,
        description: String,
        criteria: String,
    ) -> Result<(), Error> {
        let admin = get_admin(&env)?;
        admin.require_auth();

        let metadata = BadgeTypeMetadata {
            name,
            description,
            criteria,
        };

        env.storage()
            .persistent()
            .set(&StorageKey::BadgeTypeMetadata(badge_type.clone()), &metadata);

        let event_topic = Symbol::new(&env, "badge_type_created");
        env.events()
            .publish((event_topic, admin.clone()), badge_type);

        Ok(())
    }

    /// Award a badge to a user (admin only)
    /// Returns the badge ID
    pub fn award_badge(env: Env, recipient: Address, badge_type: BadgeType) -> Result<u64, Error> {
        let admin = get_admin(&env)?;
        admin.require_auth();

        // Check if recipient already has this badge type
        let ownership_key = StorageKey::TypeOwnership(recipient.clone(), badge_type.clone());
        if env.storage().persistent().has(&ownership_key) {
            return Err(Error::BadgeAlreadyOwned);
        }

        // Get and increment badge count
        let badge_count = Self::get_badge_count_internal(&env);
        let badge_id = badge_count + 1;
        env.storage()
            .persistent()
            .set(&StorageKey::BadgeCount, &badge_id);

        // Create badge
        let minted_at = env.ledger().timestamp();
        let badge = Badge {
            id: badge_id,
            badge_type: badge_type.clone(),
            minted_at,
            owner: recipient.clone(),
        };

        // Store badge
        env.storage()
            .persistent()
            .set(&StorageKey::Badge(badge_id), &badge);

        // Mark type ownership
        env.storage().persistent().set(&ownership_key, &true);

        // Update user's badge list
        let user_badges_key = StorageKey::UserBadges(recipient.clone());
        let mut user_badges: Vec<u64> = env
            .storage()
            .persistent()
            .get(&user_badges_key)
            .unwrap_or(Vec::new(&env));
        user_badges.push_back(badge_id);
        env.storage()
            .persistent()
            .set(&user_badges_key, &user_badges);

        // Emit BadgeAwarded event
        let event_payload = BadgeEvent {
            event_version: 1,
            badge_id,
            badge_type: badge_type.clone() as u32,
            owner: recipient.clone(),
            action: BadgeAction::Grant,
            timestamp: minted_at,
        };
        env.events().publish(
            (Symbol::new(&env, "badge_awarded"), recipient.clone()),
            event_payload,
        );

        Ok(badge_id)
    }

    /// Adjust user reputation (admin only)
    pub fn adjust_reputation(
        env: Env,
        user: Address,
        amount: i128,
        reason: String,
    ) -> Result<i128, Error> {
        let admin = get_admin(&env)?;
        admin.require_auth();

        let current_reputation = Self::get_user_reputation_internal(&env, &user);
        let new_reputation = current_reputation + amount;

        env.storage()
            .persistent()
            .set(&StorageKey::UserReputation(user.clone()), &new_reputation);

        let event_topic = Symbol::new(&env, "reputation_adjusted");
        env.events().publish(
            (event_topic, user.clone()),
            ReputationAdjustedData {
                user,
                amount,
                reason,
                timestamp: env.ledger().timestamp(),
            },
        );

        Ok(new_reputation)
    }

    /// Get user reputation
    pub fn get_user_reputation(env: Env, user: Address) -> i128 {
        Self::get_user_reputation_internal(&env, &user)
    }

    /// Mint a new badge for a recipient (self-service)
    /// Returns the badge ID if successful
    pub fn mint_badge(env: Env, recipient: Address, badge_type: BadgeType) -> Result<u64, Error> {
        recipient.require_auth();

        // Check if recipient already has this badge type
        let ownership_key = StorageKey::TypeOwnership(recipient.clone(), badge_type.clone());
        if env.storage().persistent().has(&ownership_key) {
            return Err(Error::BadgeAlreadyOwned);
        }

        // Get and increment badge count
        let badge_count = Self::get_badge_count_internal(&env);
        let badge_id = badge_count + 1;
        env.storage()
            .persistent()
            .set(&StorageKey::BadgeCount, &badge_id);

        // Create badge
        let minted_at = env.ledger().timestamp();
        let badge = Badge {
            id: badge_id,
            badge_type: badge_type.clone(),
            minted_at,
            owner: recipient.clone(),
        };

        // Store badge
        env.storage()
            .persistent()
            .set(&StorageKey::Badge(badge_id), &badge);

        // Mark type ownership
        env.storage().persistent().set(&ownership_key, &true);

        // Update user's badge list
        let user_badges_key = StorageKey::UserBadges(recipient.clone());
        let mut user_badges: Vec<u64> = env
            .storage()
            .persistent()
            .get(&user_badges_key)
            .unwrap_or(Vec::new(&env));
        user_badges.push_back(badge_id);
        env.storage()
            .persistent()
            .set(&user_badges_key, &user_badges);

        // Emit BadgeGranted event
        let event_payload = BadgeEvent {
            event_version: 1,
            badge_id,
            badge_type: badge_type.clone() as u32,
            owner: recipient.clone(),
            action: BadgeAction::Grant,
            timestamp: minted_at,
        };
        env.events().publish(
            (Symbol::new(&env, "badge_granted"), recipient.clone()),
            event_payload,
        );

        Ok(badge_id)
    }

    /// Get all badges owned by an address
    pub fn get_badges(env: Env, owner: Address) -> Vec<Badge> {
        let user_badges_key = StorageKey::UserBadges(owner);
        let badge_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&user_badges_key)
            .unwrap_or(Vec::new(&env));

        let mut badges = Vec::new(&env);
        for i in 0..badge_ids.len() {
            if let Some(badge_id) = badge_ids.get(i) {
                if let Some(badge) = env.storage().persistent().get(&StorageKey::Badge(badge_id)) {
                    badges.push_back(badge);
                }
            }
        }
        badges
    }

    /// Check if an owner has a specific badge type
    pub fn has_badge(env: Env, owner: Address, badge_type: BadgeType) -> bool {
        let ownership_key = StorageKey::TypeOwnership(owner, badge_type);
        env.storage().persistent().has(&ownership_key)
    }

    /// Get the total number of badges owned by an address
    pub fn get_badge_count(env: Env, owner: Address) -> u32 {
        let user_badges_key = StorageKey::UserBadges(owner);
        let badge_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&user_badges_key)
            .unwrap_or(Vec::new(&env));
        badge_ids.len()
    }

    /// Transfer a badge to another address (optional feature)
    pub fn transfer_badge(env: Env, badge_id: u64, to: Address) -> Result<(), Error> {
        // Get the badge
        let badge_key = StorageKey::Badge(badge_id);
        let mut badge: Badge = env
            .storage()
            .persistent()
            .get(&badge_key)
            .ok_or(Error::BadgeNotFound)?;

        // Require auth from current owner
        badge.owner.require_auth();

        let from = badge.owner.clone();

        // Check if recipient already owns this badge type
        let to_ownership_key = StorageKey::TypeOwnership(to.clone(), badge.badge_type.clone());
        if env
            .storage()
            .persistent()
            .get::<StorageKey, bool>(&to_ownership_key)
            .is_some()
        {
            return Err(Error::BadgeTypeAlreadyOwned);
        }

        // Remove from old owner's badge list
        let from_badges_key = StorageKey::UserBadges(from.clone());
        let from_badges: Vec<u64> = env
            .storage()
            .persistent()
            .get(&from_badges_key)
            .unwrap_or(Vec::new(&env));

        // Filter out the transferred badge
        let mut new_from_badges = Vec::new(&env);
        for i in 0..from_badges.len() {
            if let Some(id) = from_badges.get(i) {
                if id != badge_id {
                    new_from_badges.push_back(id);
                }
            }
        }
        env.storage()
            .persistent()
            .set(&from_badges_key, &new_from_badges);

        // Remove type ownership from old owner
        let from_ownership_key = StorageKey::TypeOwnership(from.clone(), badge.badge_type.clone());
        env.storage().persistent().remove(&from_ownership_key);

        // Add to new owner's badge list
        let to_badges_key = StorageKey::UserBadges(to.clone());
        let mut to_badges: Vec<u64> = env
            .storage()
            .persistent()
            .get(&to_badges_key)
            .unwrap_or(Vec::new(&env));
        to_badges.push_back(badge_id);
        env.storage().persistent().set(&to_badges_key, &to_badges);

        // Set type ownership for new owner
        env.storage().persistent().set(&to_ownership_key, &true);

        // Update badge owner
        badge.owner = to.clone();
        env.storage().persistent().set(&badge_key, &badge);

        // Emit BadgeTransferred event
        #[allow(deprecated)]
        env.events().publish(
            (Symbol::new(&env, "badge_transferred"), badge_id),
            BadgeTransferredData { badge_id, from, to },
        );

        Ok(())
    }

    /// Get a specific badge by ID
    pub fn get_badge(env: Env, badge_id: u64) -> Option<Badge> {
        env.storage().persistent().get(&StorageKey::Badge(badge_id))
    }

    /// Get total number of badges minted
    pub fn get_total_badges(env: Env) -> u64 {
        Self::get_badge_count_internal(&env)
    }

    /// Revoke a badge
    pub fn revoke_badge(env: Env, badge_id: u64) -> Result<(), Error> {
        // Get the badge
        let badge_key = StorageKey::Badge(badge_id);
        let badge: Badge = env
            .storage()
            .persistent()
            .get(&badge_key)
            .ok_or(Error::BadgeNotFound)?;

        let owner = badge.owner.clone();
        let badge_type = badge.badge_type.clone();

        // Require auth from the current owner or admin
        // Since we don't have an admin defined in this contract, let's assume the owner
        // can revoke it or there's some higher level authority. Actually, the contract
        // does not have admin. We will require the owner to authorize revocation.
        owner.require_auth();

        // Remove from owner's badge list
        let user_badges_key = StorageKey::UserBadges(owner.clone());
        let user_badges: Vec<u64> = env
            .storage()
            .persistent()
            .get(&user_badges_key)
            .unwrap_or(Vec::new(&env));

        let mut new_user_badges = Vec::new(&env);
        for i in 0..user_badges.len() {
            if let Some(id) = user_badges.get(i) {
                if id != badge_id {
                    new_user_badges.push_back(id);
                }
            }
        }
        env.storage()
            .persistent()
            .set(&user_badges_key, &new_user_badges);

        // Remove type ownership
        let ownership_key = StorageKey::TypeOwnership(owner.clone(), badge_type.clone());
        env.storage().persistent().remove(&ownership_key);

        // Remove badge from storage
        env.storage().persistent().remove(&badge_key);

        // Emit BadgeRevoked event
        let event_payload = BadgeEvent {
            event_version: 1,
            badge_id,
            badge_type: badge_type as u32,
            owner: owner.clone(),
            action: BadgeAction::Revoke,
            timestamp: env.ledger().timestamp(),
        };
        env.events()
            .publish((Symbol::new(&env, "badge_revoked"), owner), event_payload);

        Ok(())
    }

    // Internal helper to get badge count
    fn get_badge_count_internal(env: &Env) -> u64 {
        env.storage()
            .persistent()
            .get(&StorageKey::BadgeCount)
            .unwrap_or(0u64)
    }

    // Internal helper to get user reputation
    fn get_user_reputation_internal(env: &Env, user: &Address) -> i128 {
        env.storage()
            .persistent()
            .get(&StorageKey::UserReputation(user.clone()))
            .unwrap_or(0i128)
    }
}
#[cfg(test)]
mod test;
