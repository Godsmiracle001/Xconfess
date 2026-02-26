import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination/pagination.dto';

export enum CommentSortField {
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query params for GET /confessions/:id/comments.
 * Pagination bounds are inherited from PaginationDto.
 */
export class GetCommentsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: `sortOrder must be one of: ${Object.values(SortOrder).join(', ')}`,
  })
  sortOrder?: SortOrder = SortOrder.ASC;
}