use soroban_sdk::Env;

pub fn emit_config_update(
    env: &Env,
    old_limits: u32,
    old_threshold: u32,
    old_window: u32,
    new_limits: u32,
    new_threshold: u32,
    new_window: u32,
) {
    env.events().publish(
        ("ConfigUpdate",),
        (old_limits, old_threshold, old_window, new_limits, new_threshold, new_window),
    );
}