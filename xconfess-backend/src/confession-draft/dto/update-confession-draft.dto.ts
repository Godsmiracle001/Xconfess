import { PartialType, PickType } from '@nestjs/mapped-types';
import { IsNumber } from 'class-validator';
import { CreateConfessionDraftDto } from './create-confession-draft.dto';

export class UpdateConfessionDraftDto extends PartialType(
  PickType(CreateConfessionDraftDto, ['content'] as const),
) {
  @IsNumber()
  version: number;
}
