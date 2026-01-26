import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateConfessionDraftDto } from './create-confession-draft.dto';

export class UpdateConfessionDraftDto extends PartialType(
  PickType(CreateConfessionDraftDto, ['content'] as const),
) {}
