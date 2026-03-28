import { Test } from '@nestjs/testing';
import { ReportModule } from './reports.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../admin/entities/report.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';

describe('ReportModule', () => {
  it('should compile module without DI errors', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Report, AnonymousConfession],
          synchronize: true,
        }),
        ReportModule,
      ],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });

  it('should resolve ReportsService with correct dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Report, AnonymousConfession],
          synchronize: true,
        }),
        ReportModule,
      ],
    }).compile();

    const reportsService = moduleRef.get<ReportsService>(ReportsService);
    expect(reportsService).toBeDefined();
    expect(reportsService).toBeInstanceOf(ReportsService);

    await moduleRef.close();
  });

  it('should resolve all controllers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Report, AnonymousConfession],
          synchronize: true,
        }),
        ReportModule,
      ],
    }).compile();

    const reportsController =
      moduleRef.get<ReportsController>(ReportsController);
    const adminReportsController = moduleRef.get<AdminReportsController>(
      AdminReportsController,
    );

    expect(reportsController).toBeDefined();
    expect(adminReportsController).toBeDefined();

    await moduleRef.close();
  });

  it('should fail DI if AnonymousConfession is not in module imports', async () => {
    // Create a module without AnonymousConfession to simulate the original issue
    const faultyModule = Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Report, AnonymousConfession],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Report]), // Missing AnonymousConfession
      ],
      providers: [ReportsService],
      controllers: [ReportsController, AdminReportsController],
    });

    await expect(faultyModule.compile()).rejects.toThrow();
  });

  it('should have AnonymousConfession in TypeOrmModule.forFeature', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Report, AnonymousConfession],
          synchronize: true,
        }),
        ReportModule,
      ],
    }).compile();

    // Verify that the module can create repositories for both entities
    const reportRepository = moduleRef.get('ReportRepository');
    const confessionRepository = moduleRef.get('AnonymousConfessionRepository');

    expect(reportRepository).toBeDefined();
    expect(confessionRepository).toBeDefined();

    await moduleRef.close();
  });
});
