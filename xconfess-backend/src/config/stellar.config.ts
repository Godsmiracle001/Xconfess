// src/config/stellar.config.ts
// Loads Stellar config from environment for NestJS ConfigModule
import { registerAs } from '@nestjs/config';

export default registerAs('stellar', () => ({
  network: process.env.STELLAR_NETWORK || 'testnet',
  horizonUrl:
    process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl:
    process.env.STELLAR_SOROBAN_RPC_URL ||
    'https://soroban-rpc-testnet.stellar.org',
  confessionAnchorContractId: process.env.CONFESSION_ANCHOR_CONTRACT_ID,
  reputationBadgesContractId: process.env.REPUTATION_BADGES_CONTRACT_ID,
  tippingSystemContractId: process.env.TIPPING_SYSTEM_CONTRACT_ID,
  serverSecret: process.env.STELLAR_SERVER_SECRET,
}));
