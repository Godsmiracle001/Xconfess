import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { StellarService } from './stellar.service';
import { ContractService } from './contract.service';
import { VerifyTransactionDto } from './dto/verify-transaction.dto';
import { InvokeContractDto } from './dto/invoke-contract.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StellarInvokeContractGuard } from './guards/stellar-invoke-contract.guard';

@ApiTags('Stellar')
@Controller('stellar')
export class StellarController {
  constructor(
    private stellarService: StellarService,
    private contractService: ContractService,
    private configService: ConfigService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get Stellar network configuration' })
  @ApiResponse({ status: 200, description: 'Network configuration' })
  getConfig() {
    return this.stellarService.getNetworkConfig();
  }

  @Get('balance/:address')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiResponse({ status: 200, description: 'Account balance' })
  async getBalance(@Param('address') address: string) {
    return this.stellarService.getAccountBalance(address);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify transaction on-chain' })
  @ApiResponse({ status: 200, description: 'Transaction verification result' })
  async verifyTransaction(@Body() dto: VerifyTransactionDto) {
    return this.stellarService.verifyTransaction(dto.txHash);
  }

  @Get('account-exists/:address')
  @ApiOperation({ summary: 'Check if account exists' })
  async accountExists(@Param('address') address: string) {
    const exists = await this.stellarService.accountExists(address);
    return { exists };
  }

  @Post('invoke-contract')
  @ApiOperation({ summary: 'Invoke Soroban contract (admin only)' })
  @UseGuards(JwtAuthGuard, StellarInvokeContractGuard)
  async invokeContract(@Body() dto: InvokeContractDto) {
    const signerSecret = this.configService.get<string>(
      'STELLAR_SERVER_SECRET',
    );
    if (!signerSecret) {
      throw new BadRequestException(
        'Stellar server signer secret is not configured',
      );
    }

    return this.contractService.invokeContract(
      {
        contractId: dto.contractId,
        functionName: dto.functionName,
        args: dto.args,
        sourceAccount: dto.sourceAccount,
      },
      signerSecret,
    );
  }
}
