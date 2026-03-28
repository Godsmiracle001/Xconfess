pub mod model;
pub mod logic;
pub mod events;
pub mod storage;

pub use logic::{propose, approve, revoke, execute, set_config, get_config};