use soroban_sdk::{symbol_short, Address, Env};

/// Storage key for governance event nonce counter
const GOV_NONCE_KEY: &str = "gov_nonce";

/// Get the current governance event nonce
fn get_gov_nonce(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&symbol_short!(GOV_NONCE_KEY))
        .unwrap_or(0u64)
}

/// Increment and return the next governance event nonce
fn next_gov_nonce(env: &Env) -> u64 {
    let current = get_gov_nonce(env);
    let next = current + 1;
    env.storage()
        .instance()
        .set(&symbol_short!(GOV_NONCE_KEY), &next);
    next
}

pub fn proposed(e: &Env, current: Address, proposed: Address) {
    let nonce = next_gov_nonce(e);
    e.events().publish(
        (symbol_short!("gov_prop"),),
        (nonce, current, proposed),
    );
}

pub fn accepted(e: &Env, old: Address, new_admin: Address) {
    let nonce = next_gov_nonce(e);
    e.events().publish(
        (symbol_short!("gov_acc"),),
        (nonce, old, new_admin),
    );
}

pub fn cancelled(e: &Env, admin: Address) {
    let nonce = next_gov_nonce(e);
    e.events().publish(
        (symbol_short!("gov_can"),),
        (nonce, admin),
    );
}

pub fn invariant_violation(e: &Env, operation: &str, reason: &str, attempted_by: Address) {
    let nonce = next_gov_nonce(e);
    e.events().publish(
        (symbol_short!("gov_inv"),),
        (nonce, operation, reason, attempted_by),
    );
}

/// Public function to query the latest governance event nonce for reconciliation
pub fn get_latest_gov_nonce(env: &Env) -> u64 {
    get_gov_nonce(env)
}