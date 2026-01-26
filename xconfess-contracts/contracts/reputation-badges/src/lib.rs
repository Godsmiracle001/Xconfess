#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    BadgeAlreadyOwned = 1,
    BadgeNotFound = 2,
    BadgeTypeAlreadyOwned = 3,
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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeMintedData {
    pub badge_id: u64,
    pub badge_type: BadgeType,
    pub minted_at: u64,
}

/// Event data for badge transfer
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BadgeTransferredData {
    pub badge_id: u64,
    pub from: Address,
    pub to: Address,
}

#[contract]
pub struct ReputationBadges;

#[contractimpl]
impl ReputationBadges {
    /// Mint a new badge for a recipient
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

        // Emit BadgeMinted event
        #[allow(deprecated)]
        env.events().publish(
            (Symbol::new(&env, "badge_minted"), recipient.clone()),
            BadgeMintedData {
                badge_id,
                badge_type,
                minted_at,
            },
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

    // Internal helper to get badge count
    fn get_badge_count_internal(env: &Env) -> u64 {
        env.storage()
            .persistent()
            .get(&StorageKey::BadgeCount)
            .unwrap_or(0u64)
    }
}
#[cfg(test)]
mod test;
