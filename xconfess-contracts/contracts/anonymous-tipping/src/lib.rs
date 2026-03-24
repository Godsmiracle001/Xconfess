#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String as SorobanString,
};

const SETTLEMENT_EVENT: soroban_sdk::Symbol = symbol_short!("tip_settl");
const EVENT_VERSION_V1: u32 = 1;

#[contract]
pub struct AnonymousTipping;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    RecipientTotal(Address),
    SettlementNonce,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettlementReceiptEvent {
    pub event_version: u32,
    pub settlement_id: u64,
    pub recipient: Address,
    pub amount: i128,
    pub proof_metadata: SorobanString,
    pub proof_present: bool,
    pub timestamp: u64,
}

#[contractimpl]
impl AnonymousTipping {
    pub const MAX_PROOF_METADATA_LEN: u32 = 128;

    /// Initialize the tipping contract
    pub fn init(env: Env) {
        if env.storage().instance().has(&DataKey::SettlementNonce) {
            return;
        }

        env.storage().instance().set(&DataKey::SettlementNonce, &0_u64);
    }

    /// Send anonymous tip to a recipient
    pub fn send_tip(env: Env, recipient: Address, amount: i128) -> u64 {
        Self::send_tip_with_proof(
            env,
            recipient,
            amount,
            None,
        )
    }

    /// Send anonymous tip with optional bounded settlement proof metadata.
    pub fn send_tip_with_proof(
        env: Env,
        recipient: Address,
        amount: i128,
        proof_metadata: Option<SorobanString>,
    ) -> u64 {
        if amount <= 0 {
            panic!("tip amount must be positive");
        }

        let metadata = match proof_metadata {
            Some(value) => {
                if value.len() > Self::MAX_PROOF_METADATA_LEN {
                    panic!("proof metadata too long");
                }
                value
            }
            None => SorobanString::from_str(&env, ""),
        };

        let previous = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::RecipientTotal(recipient.clone()))
            .unwrap_or(0_i128);
        let next_total = previous
            .checked_add(amount)
            .expect("recipient tip total overflow");
        env.storage()
            .instance()
            .set(&DataKey::RecipientTotal(recipient.clone()), &next_total);

        let settlement_id = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::SettlementNonce)
            .unwrap_or(0_u64)
            .checked_add(1)
            .expect("settlement nonce overflow");
        env.storage()
            .instance()
            .set(&DataKey::SettlementNonce, &settlement_id);

        let payload = SettlementReceiptEvent {
            event_version: EVENT_VERSION_V1,
            settlement_id,
            recipient: recipient.clone(),
            amount,
            proof_metadata: metadata.clone(),
            proof_present: metadata.len() > 0,
            timestamp: env.ledger().timestamp(),
        };
        env.events().publish((SETTLEMENT_EVENT, recipient), payload);

        settlement_id
    }

    /// Get tip history for a recipient
    pub fn get_tips(env: Env, recipient: Address) -> i128 {
        env.storage()
            .instance()
            .get::<_, i128>(&DataKey::RecipientTotal(recipient))
            .unwrap_or(0_i128)
    }

    /// Read helper used by backend indexers/reconciliation workers.
    pub fn latest_settlement_nonce(env: Env) -> u64 {
        env.storage()
            .instance()
            .get::<_, u64>(&DataKey::SettlementNonce)
            .unwrap_or(0_u64)
    }
}
