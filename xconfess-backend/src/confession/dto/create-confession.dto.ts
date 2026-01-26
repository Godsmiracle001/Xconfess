import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { Gender } from './get-confessions.dto';

export class CreateConfessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Confession cannot exceed 1000 characters' })
  message: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'Maximum 3 tags allowed per confession' })
  @IsUUID('4', { each: true, message: 'Each tag must be a valid UUID' })
  tagIds?: string[];
}
