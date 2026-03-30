use soroban_sdk::{Env, String, symbol_short};

pub fn emit_paused(env: &Env, actor: &soroban_sdk::Address, reason: String) {
    env.events().publish(
        (symbol_short!("paused"), actor.clone()),
        reason
    );
}

pub fn emit_unpaused(env: &Env, actor: &soroban_sdk::Address, reason: String) {
    env.events().publish(
        (symbol_short!("unpaused"), actor.clone()),
        reason
    );
}