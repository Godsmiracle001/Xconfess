import { ApiProperty } from '@nestjs/swagger';

export class PlatformStatsDto {
  @ApiProperty({ description: 'Total registered users' })
  totalUsers: number;

  @ApiProperty({ description: 'Total confessions created' })
  totalConfessions: number;

  @ApiProperty({ description: 'Total reactions given' })
  totalReactions: number;

  @ApiProperty({ description: 'Published confessions' })
  publishedConfessions: number;

  @ApiProperty({ description: 'Pending confessions' })
  pendingConfessions: number;

  @ApiProperty({ description: 'Average reactions per confession' })
  averageReactionsPerConfession: string;

  @ApiProperty({ description: 'Most popular category' })
  mostPopularCategory: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}
