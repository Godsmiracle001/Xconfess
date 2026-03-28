import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  message?: boolean;

  @IsOptional()
  @IsBoolean()
  reaction?: boolean;

  @IsOptional()
  @IsBoolean()
  moderation?: boolean;

  @IsOptional()
  @IsBoolean()
  system?: boolean;
}
