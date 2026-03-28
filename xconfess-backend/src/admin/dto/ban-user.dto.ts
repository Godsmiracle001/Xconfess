import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BanUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
