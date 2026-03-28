import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class VerifyTipDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-fA-F0-9]{64}$/, {
    message: 'Transaction ID must be a valid 64-character hex string',
  })
  txId: string;
}
