import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/pagination/pagination.dto';

export enum CommentSortField {
  CREATED_AT = 'createdAt',
  ID = 'id',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query params for GET /confessions/:id/comments.
 * Supports both cursor-based and offset-based pagination.
 */
export class GetCommentsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Cursor for stable pagination. Base64 encoded JSON with id and timestamp.',
    example:
      'eyJpZCI6MTIzLCJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    enum: CommentSortField,
    default: CommentSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(CommentSortField, {
    message: `sortField must be one of: ${Object.values(CommentSortField).join(', ')}`,
  })
  sortField?: CommentSortField = CommentSortField.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: `sortOrder must be one of: ${Object.values(SortOrder).join(', ')}`,
  })
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Include replies to deleted/hidden parent comments',
    default: false,
  })
  @IsOptional()
  includeOrphanedReplies?: boolean = false;
}
