import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as StellarSDK from '@stellar/stellar-sdk';
import { StellarService } from './stellar.service';
import { ContractService } from './contract.service';
import { VerifyTransactionDto } from './dto/verify-transaction.dto';
import { InvokeContractDto } from './dto/invoke-contract.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StellarInvokeContractGuard } from './guards/stellar-invoke-contract.guard';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditActionType } from '../audit-log/audit-log.entity';
import { AuthenticatedRequest } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Stellar')
@Controller('stellar')
export class StellarController {
  constructor(
    private stellarService: StellarService,
    private contractService: ContractService,
    private configService: ConfigService,
    private auditLogService: AuditLogService,
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
  @ApiOperation({
    summary: 'Invoke allowlisted Soroban operation (server-signed, admin)',
  })
  @UseGuards(JwtAuthGuard, StellarInvokeContractGuard)
  async invokeContract(
    @Body() dto: InvokeContractDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const signerSecret = this.configService.get<string>(
      'STELLAR_SERVER_SECRET',
    );
    if (!signerSecret) {
      throw new BadRequestException(
        'Stellar server signer secret is not configured',
      );
    }

    const signerPk = StellarSDK.Keypair.fromSecret(signerSecret).publicKey();
    if (dto.sourceAccount !== signerPk) {
      await this.auditStellarInvocation(req, dto, {
        outcome: 'denied',
        denialReason: 'source_account_mismatch',
        expectedSourceAccount: signerPk,
      });
      throw new BadRequestException(
        'sourceAccount must be the public key of the configured server signer',
      );
    }

    const invocation = this.contractService.invocationFromAllowlistedDto(
      dto,
      signerPk,
    );

    try {
      const result = await this.contractService.invokeContract(
        invocation,
        signerSecret,
      );
      await this.auditStellarInvocation(req, dto, {
        outcome: result.success ? 'success' : 'failed',
        transactionHash: result.hash,
        chainSuccess: result.success,
        contractId: invocation.contractId,
        functionName: invocation.functionName,
      });
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.auditStellarInvocation(req, dto, {
        outcome: 'failed',
        contractId: invocation.contractId,
        functionName: invocation.functionName,
        errorMessage: message.slice(0, 500),
      });
      throw err;
    }
  }

  private async auditStellarInvocation(
    req: AuthenticatedRequest,
    dto: InvokeContractDto,
    fields: Record<string, unknown>,
  ): Promise<void> {
    const base: Record<string, unknown> = {
      entityType: 'stellar_invocation',
      entityId: dto.operation,
      stellarOperation: dto.operation,
      actorUserId: req.user.id,
      ...fields,
    };
    if (dto.operation === 'anchor_confession') {
      base.confessionHash = dto.confessionHash;
      base.timestamp = dto.timestamp;
    }
    await this.auditLogService.log({
      actionType: AuditActionType.STELLAR_CONTRACT_INVOCATION,
      context: { userId: req.user.id },
      metadata: base,
    });
  }
}
