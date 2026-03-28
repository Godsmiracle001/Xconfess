import { faker } from '@faker-js/faker';

export interface UserData {
  id?: number;
  email?: string;
  username?: string;
  password?: string;
  stellarPublicKey?: string;
  stellarSecretKey?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserFactory {
  static build(overrides: Partial<UserData> = {}): UserData {
    return {
      id: faker.number.int({ min: 1, max: 1000 }),
      email: faker.internet.email(),
      username: faker.internet.username(),
      password: faker.internet.password({ length: 12 }),
      stellarPublicKey: this.generateStellarPublicKey(),
      stellarSecretKey: this.generateStellarSecretKey(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static buildMany(
    count: number,
    overrides: Partial<UserData> = {},
  ): UserData[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  private static generateStellarPublicKey(): string {
    return 'G' + faker.string.alphanumeric({ length: 55, casing: 'upper' });
  }

  private static generateStellarSecretKey(): string {
    return 'S' + faker.string.alphanumeric({ length: 55, casing: 'upper' });
  }
}
