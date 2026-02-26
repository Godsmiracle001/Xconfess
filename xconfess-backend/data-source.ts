import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from the backend directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USERNAME || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error('Missing required database environment variables');
}

const dbPort = parseInt(process.env.DB_PORT, 10);
if (isNaN(dbPort)) {
  throw new Error('DB_PORT must be a valid number');
}

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: dbPort,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/src/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*{.ts,js}'],
  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});
