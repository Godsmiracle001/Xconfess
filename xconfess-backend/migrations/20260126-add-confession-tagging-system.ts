import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class AddConfessionTaggingSystem1737869868000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tags table
    await queryRunner.createTable(
      new Table({
        name: 'tags',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '60',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index on name for faster lookups
    await queryRunner.query(`CREATE INDEX "IDX_tags_name" ON "tags" ("name")`);

    // Create confession_tags junction table
    await queryRunner.createTable(
      new Table({
        name: 'confession_tags',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'confession_id',
            type: 'uuid',
          },
          {
            name: 'tag_id',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key for confession_id
    await queryRunner.createForeignKey(
      'confession_tags',
      new TableForeignKey({
        columnNames: ['confession_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'anonymous_confessions',
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key for tag_id
    await queryRunner.createForeignKey(
      'confession_tags',
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tags',
        onDelete: 'CASCADE',
      }),
    );

    // Add unique constraint to prevent duplicate tag assignments
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_confession_tags_unique" ON "confession_tags" ("confession_id", "tag_id")`,
    );

    // Seed predefined tags
    await queryRunner.query(`
      INSERT INTO tags (name, display_name, description, is_active) VALUES
      ('funny', '#funny', 'Humorous or amusing confessions', true),
      ('sad', '#sad', 'Sad or melancholic confessions', true),
      ('inspiring', '#inspiring', 'Motivational or uplifting confessions', true),
      ('love', '#love', 'Confessions about love and relationships', true),
      ('shocking', '#shocking', 'Surprising or shocking revelations', true),
      ('heartwarming', '#heartwarming', 'Touching and heartwarming stories', true),
      ('advice', '#advice', 'Seeking or giving advice', true),
      ('question', '#question', 'Questions or seeking answers', true),
      ('regret', '#regret', 'Confessions about regrets', true),
      ('secret', '#secret', 'Deep secrets and hidden truths', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const confessionTagsTable = await queryRunner.getTable('confession_tags');
    if (confessionTagsTable) {
      const foreignKeys = confessionTagsTable.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('confession_tags', foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_confession_tags_unique"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tags_name"`);

    // Drop tables
    await queryRunner.dropTable('confession_tags', true);
    await queryRunner.dropTable('tags', true);
  }
}
