import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StellarService } from './stellar.service';
import { ContractService } from './contract.service';
import { VerifyTransactionDto } from './dto/verify-transaction.dto';
import { InvokeContractDto } from './dto/invoke-contract.dto';

@ApiTags('Stellar')
@Controller('stellar')
export class StellarController {
  constructor(
    private stellarService: StellarService,
    private contractService: ContractService,
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
  // @UseGuards(AdminGuard) // Add proper authentication
  async invokeContract(@Body() dto: InvokeContractDto) {
    // TODO: Add proper authentication and authorization
    // For now, this is a protected endpoint
    throw new Error('Not implemented - requires authentication');
  }
}
