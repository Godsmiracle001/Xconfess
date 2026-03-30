#![no_std]
use soroban_sdk::contracttype;

/// Typed errors for the Anonymous Tipping contract
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Error {
    /// Tip amount is zero or negative
    InvalidTipAmount,

    /// Metadata exceeds allowed length
    MetadataTooLarge,

    /// Total tip value overflowed
    TotalOverflow,

    /// Nonce value overflowed
    NonceOverflow,

    /// Unauthorized action
    Unauthorized,
}