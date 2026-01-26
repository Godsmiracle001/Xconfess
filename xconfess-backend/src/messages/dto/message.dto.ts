import { IsUUID, IsString, MinLength, MaxLength, IsInt } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  confession_id: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

export class ReplyMessageDto {
  @IsInt()
  message_id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reply: string;
}
