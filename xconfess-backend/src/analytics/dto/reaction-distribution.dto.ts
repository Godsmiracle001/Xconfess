import { ApiProperty } from '@nestjs/swagger';

export class ReactionTypeDto {
  @ApiProperty({ description: 'Reaction type' })
  type: string;

  @ApiProperty({ description: 'Count of this reaction type' })
  count: number;

  @ApiProperty({ description: 'Percentage of total reactions' })
  percentage: string;
}

export class ReactionDistributionDto {
  @ApiProperty({ description: 'Total reactions' })
  total: number;

  @ApiProperty({
    description: 'Reaction distribution by type',
    type: [ReactionTypeDto],
  })
  distribution: ReactionTypeDto[];

  @ApiProperty({ description: 'Time period analyzed' })
  period: string;
}
