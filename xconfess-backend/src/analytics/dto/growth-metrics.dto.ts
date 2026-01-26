import { ApiProperty } from '@nestjs/swagger';

export class DailyGrowthDto {
  @ApiProperty({ description: 'Date' })
  date: string;

  @ApiProperty({ description: 'Number of confessions created' })
  count: number;
}

export class GrowthMetricsDto {
  @ApiProperty({ description: 'Time period analyzed' })
  period: string;

  @ApiProperty({ description: 'Total confessions in period' })
  totalConfessions: number;

  @ApiProperty({ description: 'Average confessions per day' })
  averagePerDay: number;

  @ApiProperty({
    description: 'Daily growth breakdown',
    type: [DailyGrowthDto],
  })
  dailyGrowth: DailyGrowthDto[];

  @ApiProperty({
    description: 'Growth trend',
    enum: ['increasing', 'decreasing', 'stable'],
  })
  trend: string;
}
