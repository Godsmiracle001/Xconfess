import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class MigrationVerificationService implements OnModuleInit {
    private readonly logger = new Logger('MigrationVerification');

    constructor(@InjectDataSource() private dataSource: DataSource) { }

    async onModuleInit() {
        this.logger.log('Starting migration verification check...');
        await this.verifyConfessionsSchema();
    }

    private async verifyConfessionsSchema() {
        try {
            // Check for columns
            const columns = await this.dataSource.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'anonymous_confessions' 
        AND column_name IN ('search_vector', 'view_count');
      `);

            const columnNames = columns.map((c: any) => c.column_name);

            if (!columnNames.includes('search_vector')) {
                this.logger.error('CRITICAL: Column "search_vector" missing on "anonymous_confessions" table!');
            } else {
                this.logger.log('Verified: Column "search_vector" exists.');
            }

            if (!columnNames.includes('view_count')) {
                this.logger.error('CRITICAL: Column "view_count" missing on "anonymous_confessions" table!');
            } else {
                this.logger.log('Verified: Column "view_count" exists.');
            }

            // Check for indexes
            const indexes = await this.dataSource.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'anonymous_confessions' 
        AND indexname IN ('idx_confession_search_vector', 'idx_confession_created_at');
      `);

            const indexNames = indexes.map((i: any) => i.indexname);

            if (!indexNames.includes('idx_confession_search_vector')) {
                this.logger.error('CRITICAL: Index "idx_confession_search_vector" missing on "anonymous_confessions" table!');
            } else {
                this.logger.log('Verified: Index "idx_confession_search_vector" exists.');
            }

        } catch (error) {
            this.logger.error(`Error during migration verification: ${error.message}`);
        }
    }
}
