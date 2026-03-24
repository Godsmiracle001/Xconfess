import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditJobFanoutActionTypes20260324000200
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type t
          WHERE t.typname = 'audit_logs_action_type_enum'
        ) THEN
          ALTER TYPE "audit_logs_action_type_enum" ADD VALUE IF NOT EXISTS 'export_cleanup_expired';
          ALTER TYPE "audit_logs_action_type_enum" ADD VALUE IF NOT EXISTS 'notification_outbox_dispatched';
          ALTER TYPE "audit_logs_action_type_enum" ADD VALUE IF NOT EXISTS 'report_realtime_fanout';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM pg_type t
          WHERE t.typname = 'audit_logs_action_enum'
        ) THEN
          ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'export_cleanup_expired';
          ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'notification_outbox_dispatched';
          ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'report_realtime_fanout';
        END IF;
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // Postgres enum values are not removed safely in a reversible way.
  }
}
