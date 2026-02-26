use soroban_sdk::{symbol_short, Address, Env};

pub fn proposed(e: &Env, current: Address, proposed: Address) {
    e.events().publish(
        (symbol_short!("gov_prop"),),
        (current, proposed),
    );
}

pub fn accepted(e: &Env, old: Address, new_admin: Address) {
    e.events().publish(
        (symbol_short!("gov_acc"),),
        (old, new_admin),
    );
}

pub fn cancelled(e: &Env, admin: Address) {
    e.events().publish(
        (symbol_short!("gov_can"),),
        admin,
    );
}

pub fn invariant_violation(e: &Env, operation: &str, reason: &str, attempted_by: Address) {
    e.events().publish(
        (symbol_short!("gov_inv"),),
        (operation, reason, attempted_by),
    );
}