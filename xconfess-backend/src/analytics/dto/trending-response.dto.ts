// src/analytics/dto/trending-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class TrendingConfessionDto {
  @ApiProperty({ description: 'Confession ID' })
  id: string;

  @ApiProperty({ description: 'Confession content preview' })
  content: string;

  @ApiProperty({ description: 'Total reaction count' })
  reactionCount: number;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Confession category' })
  category: string;
}
