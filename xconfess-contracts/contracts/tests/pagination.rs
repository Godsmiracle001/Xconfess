#[test]
fn test_confession_pagination_full_walk() {
    let env = Env::default();
    let contract_id = env.register_contract(None, XConfessContract);
    let client = XConfessContractClient::new(&env, &contract_id);

    for i in 0..15 {
        client.create_confession(&format!("confession {}", i).into());
    }

    let mut cursor = None;
    let mut total = 0;

    loop {
        let (page, next) = client.list_confessions(&cursor, &4);

        if page.is_empty() {
            break;
        }

        total += page.len();
        cursor = next;
    }

    assert_eq!(total, 15);
}