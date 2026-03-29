use soroban_sdk::{contracttype, Env, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Report {
    pub id: u64,
    pub created_seq: u64,
    pub confession_id: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum ReportKey {
    Counter,
    Registry(u64),
    Index((u64, u64)),
}

pub fn create(env: &Env, confession_id: u64) -> u64 {
    let mut id: u64 = env
        .storage()
        .instance()
        .get(&ReportKey::Counter)
        .unwrap_or(0);

    id += 1;
    let created_seq = env.ledger().sequence();

    let report = Report {
        id,
        created_seq,
        confession_id,
    };

    env.storage()
        .instance()
        .set(&ReportKey::Registry(id), &report);

    env.storage()
        .instance()
        .set(&ReportKey::Index((created_seq, id)), &id);

    env.storage()
        .instance()
        .set(&ReportKey::Counter, &id);

    id
}