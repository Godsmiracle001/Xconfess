import { IsString, IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvokeContractDto {
  @ApiProperty({ description: 'Contract ID' })
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({ description: 'Function name to invoke' })
  @IsString()
  @IsNotEmpty()
  functionName: string;

  @ApiProperty({ description: 'Function arguments', type: [Object] })
  @IsArray()
  args: any[];

  @ApiProperty({ description: 'Source account public key' })
  @IsString()
  @IsNotEmpty()
  sourceAccount: string;
}
