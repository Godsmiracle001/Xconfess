import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from './get-confessions.dto';

export class CreateConfessionDto {
  @ApiProperty({ description: 'Confession message text', maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Confession cannot exceed 1000 characters' })
  message: string;

  @ApiPropertyOptional({
    enum: Gender,
    description: 'Gender of the confession author',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Tags for the confession (max 3)',
    type: [String],
    maxItems: 3,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'Maximum 3 tags allowed per confession' })
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Stellar transaction hash for anchoring',
  })
  @IsOptional()
  @IsString()
  stellarTxHash?: string;
}
