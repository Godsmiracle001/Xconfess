use soroban_sdk::{Env, String};

use crate::emergency_pause::{
    storage::DataKey,
    errors::PauseError,
    events::{emit_paused, emit_unpaused},
    admin::require_admin,
};

pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

pub fn assert_not_paused(env: &Env) -> Result<(), PauseError> {
    if is_paused(env) {
        return Err(PauseError::ContractPaused);
    }
    Ok(())
}

pub fn pause(env: Env, reason: String) -> Result<(), PauseError> {
    let actor = require_admin(&env)?;

    if is_paused(&env) {
        return Err(PauseError::AlreadyPaused);
    }

    env.storage().instance().set(&DataKey::Paused, &true);

    emit_paused(&env, &actor, reason);

    Ok(())
}

pub fn unpause(env: Env, reason: String) -> Result<(), PauseError> {
    let actor = require_admin(&env)?;

    if !is_paused(&env) {
        return Err(PauseError::NotPaused);
    }

    env.storage().instance().set(&DataKey::Paused, &false);

    emit_unpaused(&env, &actor, reason);

    Ok(())
}