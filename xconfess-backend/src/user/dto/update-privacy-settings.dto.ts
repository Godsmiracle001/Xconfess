import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePrivacySettingsDto {
  @IsOptional()
  @IsBoolean()
  isDiscoverable?: boolean;

  @IsOptional()
  @IsBoolean()
  canReceiveReplies?: boolean;

  @IsOptional()
  @IsBoolean()
  showReactions?: boolean;
}

export class PrivacySettingsResponseDto {
  isDiscoverable: boolean;
  canReceiveReplies: boolean;
  showReactions: boolean;
}
