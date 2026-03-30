use soroban_sdk::contracttype;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ContractError {
    /// ===========================================
    /// Global / common errors
    /// ===========================================
    Unauthorized,       // caller not authorized
    NotFound,           // requested entity not found
    InvalidInput,       // input value invalid
    Overflow,           // arithmetic overflow
    CooldownActive,     // update cooldown not elapsed
    PayloadTooLarge,    // emitted payload or metadata exceeds configured bound
    MetadataTooLong,    // metadata field length exceeded

    /// ===========================================
    /// Confession module errors
    /// ===========================================
    ConfessionExists,   // trying to create a duplicate confession
    ConfessionEmpty,    // empty confession content
    ConfessionTooLong,  // content exceeds max length

    /// ===========================================
    /// Reaction module errors
    /// ===========================================
    ReactionExists,     // user already reacted
    InvalidReactionType,// reaction type not recognized

    /// ===========================================
    /// Report module errors
    /// ===========================================
    ReportExists,       // user already reported
    InvalidReportReason,// report reason not allowed

    /// ===========================================
    /// Governance module errors
    /// ===========================================
    ProposalNotFound,
    UnauthorizedApproval,
    QuorumNotReached,
    AlreadyApproved,
    AlreadyExecuted,
    InvalidAction,
    ReportReasonTooLong,// report reason exceeds configured max
}

impl ContractError {
    pub fn code(&self) -> u32 {
        match self {
            ContractError::Unauthorized => 1000,
            ContractError::NotFound => 1001,
            ContractError::InvalidInput => 1002,
            ContractError::Overflow => 1003,
            ContractError::CooldownActive => 1004,
            ContractError::PayloadTooLarge => 1005,
            ContractError::MetadataTooLong => 1006,

            ContractError::ConfessionExists => 2000,
            ContractError::ConfessionEmpty => 2001,
            ContractError::ConfessionTooLong => 2002,

            ContractError::ReactionExists => 3000,
            ContractError::InvalidReactionType => 3001,

            ContractError::ReportExists => 4000,
            ContractError::InvalidReportReason => 4001,

            ContractError::ProposalNotFound => 5000,
            ContractError::UnauthorizedApproval => 5001,
            ContractError::QuorumNotReached => 5002,
            ContractError::AlreadyApproved => 5003,
            ContractError::AlreadyExecuted => 5004,
            ContractError::InvalidAction => 5005,
            ContractError::ReportReasonTooLong => 4002,
        }
    }

    pub fn message(&self) -> &'static str {
        match self {
            ContractError::Unauthorized => "caller not authorized",
            ContractError::NotFound => "entity not found",
            ContractError::InvalidInput => "invalid input",
            ContractError::Overflow => "arithmetic overflow",
            ContractError::CooldownActive => "cooldown period not elapsed",
            ContractError::PayloadTooLarge => "payload exceeds configured limit",
            ContractError::MetadataTooLong => "metadata field too long",

            ContractError::ConfessionExists => "confession already exists",
            ContractError::ConfessionEmpty => "confession content empty",
            ContractError::ConfessionTooLong => "confession content too long",

            ContractError::ReactionExists => "reaction already exists",
            ContractError::InvalidReactionType => "reaction type invalid",

            ContractError::ReportExists => "report already exists",
            ContractError::InvalidReportReason => "report reason invalid",

            ContractError::ProposalNotFound => "governance proposal not found",
            ContractError::UnauthorizedApproval => "caller not authorized to approve",
            ContractError::QuorumNotReached => "quorum threshold not met",
            ContractError::AlreadyApproved => "caller already approved this proposal",
            ContractError::AlreadyExecuted => "proposal already executed",
            ContractError::InvalidAction => "invalid governance action",
            ContractError::ReportReasonTooLong => "report reason too long",
        }
    }
}
