import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StellarConfigService } from './stellar-config.service';
import { TransactionBuilderService } from './transaction-builder.service';
import { StellarService } from './stellar.service';
import { ContractService } from './contract.service';
import { StellarController } from './stellar.controller';
import { StellarInvokeContractGuard } from './guards/stellar-invoke-contract.guard';

@Module({
  imports: [ConfigModule],
  providers: [
    StellarConfigService,
    TransactionBuilderService,
    StellarService,
    ContractService,
    StellarInvokeContractGuard,
  ],
  controllers: [StellarController],
  exports: [
    StellarConfigService,
    TransactionBuilderService,
    StellarService,
    ContractService,
  ],
})
export class StellarModule {}
