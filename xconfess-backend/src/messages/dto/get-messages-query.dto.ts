import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination/pagination.dto';

export enum MessageSortField {
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query params for GET /messages.
 * Pagination bounds are inherited from PaginationDto.
 */
export class GetMessagesQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter to a specific conversation UUID.' })
  @IsOptional()
  @IsUUID('4', { message: 'conversationId must be a valid UUID.' })
  conversationId?: string;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: `sortOrder must be one of: ${Object.values(SortOrder).join(', ')}`,
  })
  sortOrder?: SortOrder = SortOrder.ASC;
}