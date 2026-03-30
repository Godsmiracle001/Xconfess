use soroban_sdk::{Env, String};

use crate::emergency_pause::*;

#[test]
fn test_pause_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = env.accounts().generate();
    set_admin(&env, admin.clone());

    assert_eq!(is_paused(&env), false);

    pause(env.clone(), String::from_str(&env, "incident")).unwrap();

    assert_eq!(is_paused(&env), true);

    let result = assert_not_paused(&env);
    assert!(result.is_err());

    unpause(env.clone(), String::from_str(&env, "resolved")).unwrap();

    assert_eq!(is_paused(&env), false);
}