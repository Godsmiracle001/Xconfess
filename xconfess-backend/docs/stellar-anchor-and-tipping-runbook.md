# Stellar anchor and tipping runbook

## Tip verification rules

A transaction is only accepted as a valid tip when ALL of the following are true:

1. The transaction exists on-chain and can be fetched from Horizon.
2. Exactly one payment operation in the transaction matches the tip flow:
   - `type` must be `payment`
   - `asset_type` must be `native` (XLM only)
   - `to` must match the configured `TIP_RECIPIENT_ADDRESS`
   - `amount` must be greater than or equal to the expected tip amount
3. If more than one operation matches the above criteria, the transaction is
   rejected as ambiguous.

## Why these rules exist

Before this fix, the backend accepted any transaction containing a native XLM
payment over the minimum amount. That meant an unrelated XLM transfer could be
misclassified as a valid confession tip.

## Environment variables

| Variable | Description |
|---|---|
| `TIP_RECIPIENT_ADDRESS` | The Stellar account that must receive the tip |
| `STELLAR_HORIZON_URL` | Horizon server URL (defaults to testnet) |

## Testing locally

1. Set `TIP_RECIPIENT_ADDRESS` in your `.env` file.
2. Run `npm test -- tipping.service.spec` to run the tip verification tests.
3. To test against a real transaction, use the Stellar testnet and send a
   payment to the configured recipient address.