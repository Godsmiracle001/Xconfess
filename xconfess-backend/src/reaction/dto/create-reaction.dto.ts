import { IsNotEmpty, IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateReactionDto {
  @IsUUID()
  @IsNotEmpty()
  confessionId: string; //

  @IsString()
  @IsNotEmpty()
  emoji: string;

  @IsOptional()
  @IsUUID()
  anonymousUserId?: string;
}
