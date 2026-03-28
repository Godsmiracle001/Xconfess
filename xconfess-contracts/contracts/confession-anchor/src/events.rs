#![allow(dead_code)]

/// Bump when event payload shape/topic compatibility changes in a breaking way.
pub const EVENT_SCHEMA_VERSION: u32 = 1;

/// Topic emitted by `anchor_confession`.
pub const CONFESSION_ANCHORED_TOPIC: &str = "confession_anchor";
