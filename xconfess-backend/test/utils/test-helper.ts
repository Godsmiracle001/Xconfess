import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';

export class TestHelpers {
  static async createTestingModule(imports: any[]): Promise<TestingModule> {
    return Test.createTestingModule({
      imports,
    }).compile();
  }

  static setupApp(app: INestApplication): void {
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
  }

  static async closeApp(app: INestApplication): Promise<void> {
    await app.close();
  }

  static async cleanDatabase(dataSource: DataSource): Promise<void> {
    const entities = dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
  }

  static async resetSequences(dataSource: DataSource): Promise<void> {
    const entities = dataSource.entityMetadatas;

    for (const entity of entities) {
      const tableName = entity.tableName;
      await dataSource.query(
        `ALTER SEQUENCE IF EXISTS "${tableName}_id_seq" RESTART WITH 1;`,
      );
    }
  }
}

export const createAuthHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

export const extractCookieValue = (
  response: request.Response,
  cookieName: string,
): string | null => {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;

  const cookie = Array.isArray(cookies)
    ? cookies.find((c) => c.startsWith(`${cookieName}=`))
    : cookies;

  if (!cookie) return null;

  const match = cookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
};
