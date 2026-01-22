import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { Gender } from '../entities/user.entity';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsBoolean()
  canReceiveMessages?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  isProfilePublic?: boolean;
}
