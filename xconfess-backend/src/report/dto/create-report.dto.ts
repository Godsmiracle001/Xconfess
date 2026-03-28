export class CreateReportDto {
  reporterId: string;
  targetId: string;
  reason?: string;
  idempotencyKey?: string;
}