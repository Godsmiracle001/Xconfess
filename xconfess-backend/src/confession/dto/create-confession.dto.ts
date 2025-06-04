import { IsNotEmpty, IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { Gender } from './get-confessions.dto';

export class CreateConfessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Confession cannot exceed 1000 characters' })
  message: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
