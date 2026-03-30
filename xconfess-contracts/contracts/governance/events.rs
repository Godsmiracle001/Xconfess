use crate::events::next_governance_nonce;
use soroban_sdk::{contracttype, symbol_short, Address, Env, String as SorobanString};

// #403: bound governance free-form metadata to keep event payloads predictable.
pub const MAX_GOV_TEXT_LEN: usize = 128;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceProposedEvent {
    pub nonce: u64,
    pub timestamp: u64,
    pub current: Address,
    pub proposed: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceAcceptedEvent {
    pub nonce: u64,
    pub timestamp: u64,
    pub old: Address,
    pub new_admin: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceCancelledEvent {
    pub nonce: u64,
    pub timestamp: u64,
    pub admin: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceInvariantViolationEvent {
    pub nonce: u64,
    pub timestamp: u64,
    pub operation: SorobanString,
    pub reason: SorobanString,
    pub attempted_by: Address,
}

pub fn action_proposed(e: &Env, proposal_id: u64, proposer: Address) {
    e.events()
        .publish((symbol_short!("gov_prop"), proposal_id), proposer);
}

pub fn action_approved(e: &Env, proposal_id: u64, approver: Address) {
    e.events()
        .publish((symbol_short!("gov_app"), proposal_id), approver);
}

pub fn approval_revoked(e: &Env, proposal_id: u64, actor: Address) {
    e.events()
        .publish((symbol_short!("gov_rev"), proposal_id), actor);
}

pub fn action_executed(e: &Env, proposal_id: u64, executor: Address) {
    e.events()
        .publish((symbol_short!("gov_exec"), proposal_id), executor);
}

pub fn proposed(e: &Env, current: Address, proposed: Address) {
    e.events()
        .publish((symbol_short!("adm_prop"),), (current, proposed));
}

pub fn accepted(e: &Env, old: Address, new_admin: Address) {
    e.events()
        .publish((symbol_short!("adm_acc"),), (old, new_admin));
}

pub fn cancelled(e: &Env, admin: Address) {
    e.events().publish((symbol_short!("adm_can"),), admin);
}

pub fn invariant_violation(e: &Env, operation: &str, reason: &str, attempted_by: Address) {
    if operation.len() > MAX_GOV_TEXT_LEN {
        panic!("governance operation metadata too long");
    }
    if reason.len() > MAX_GOV_TEXT_LEN {
        panic!("governance reason metadata too long");
    }

    let stream = symbol_short!("gov_inv");
    let payload = GovernanceInvariantViolationEvent {
        nonce: next_governance_nonce(e, stream.clone()),
        timestamp: e.ledger().timestamp(),
        operation: SorobanString::from_str(e, operation),
        reason: SorobanString::from_str(e, reason),
        attempted_by,
    };
    e.events().publish((stream,), payload);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::latest_governance_nonce;
    use soroban_sdk::{contract, testutils::Address as _};

    #[contract]
    struct TestHost;

    #[test]
    fn governance_metadata_exact_limit_succeeds() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestHost);
        let actor = Address::generate(&env);
        let op = "o".repeat(MAX_GOV_TEXT_LEN);
        let reason = "r".repeat(MAX_GOV_TEXT_LEN);

        env.as_contract(&contract_id, || {
            invariant_violation(&env, &op, &reason, actor);
            assert_eq!(latest_governance_nonce(&env, symbol_short!("gov_inv")), 1);
        });
    }

    #[test]
    #[should_panic(expected = "governance reason metadata too long")]
    fn governance_metadata_limit_plus_one_rejected() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestHost);
        let actor = Address::generate(&env);
        let op = "o".repeat(MAX_GOV_TEXT_LEN);
        let reason = "r".repeat(MAX_GOV_TEXT_LEN + 1);

        env.as_contract(&contract_id, || {
            invariant_violation(&env, &op, &reason, actor);
        });
    }
}
