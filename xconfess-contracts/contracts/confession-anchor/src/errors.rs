#![allow(dead_code)]

/// Bump when error code mapping changes in a breaking way.
pub const ERROR_REGISTRY_VERSION: u32 = 1;

/// Reserved registry code range for metadata/introspection compatibility issues.
pub const ERR_METADATA_REGISTRY_BASE: u32 = 9000;
