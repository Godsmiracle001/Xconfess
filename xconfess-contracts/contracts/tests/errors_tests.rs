use xconfess_contract::errors::ContractError;

#[test]
fn test_error_codes_and_messages() {
    let e = ContractError::Unauthorized;
    assert_eq!(e.code(), 1000);
    assert_eq!(e.message(), "caller not authorized");

    let e = ContractError::ConfessionEmpty;
    assert_eq!(e.code(), 2001);
    assert_eq!(e.message(), "confession content empty");
}