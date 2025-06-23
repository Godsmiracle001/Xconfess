import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SortOrder {
  TRENDING = 'trending',
  NEWEST = 'newest',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export class GetTrendingConfessionsDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder = SortOrder.TRENDING;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsInt()
  @Min(0)
  view_count?: number = 0;
} 