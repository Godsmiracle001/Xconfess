import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Query,
  NotFoundException,
  // UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import {
  NotificationJobData,
  NOTIFICATION_DLQ,
  NOTIFICATION_QUEUE,
} from './notification.queue';
// import { AdminGuard } from '../../auth/guards/admin.guard';

interface DlqJobView {
  id: string | number | undefined;
  userId: string;
  type: string;
  title: string;
  failedAt: string | undefined;
  attemptsMade: number | undefined;
  lastError: string | undefined;
  enqueuedAt: number;
}

function toView(job: Job<NotificationJobData>): DlqJobView {
  return {
    id: job.id,
    userId: job.data.userId,
    type: job.data.type,
    title: job.data.title,
    failedAt: job.data._meta?.failedAt,
    attemptsMade: job.data._meta?.attemptsMade,
    lastError: job.data._meta?.lastError,
    enqueuedAt: job.timestamp,
  };
}

/**
 * Admin-only controller for dead-letter queue visibility and management.
 *
 * Endpoints:
 *   GET    /admin/dlq              – list failed notification jobs (paginated)
 *   GET    /admin/dlq/:id          – inspect a single DLQ job
 *   POST   /admin/dlq/:id/retry    – re-enqueue a DLQ job for reprocessing
 *   DELETE /admin/dlq/:id          – permanently remove a DLQ job
 *   DELETE /admin/dlq              – drain the entire DLQ (use with caution)
 */
// @UseGuards(AdminGuard)   ← uncomment once AdminGuard is in place
@Controller('admin/dlq')
export class DlqAdminController {
  constructor(
    @InjectQueue(NOTIFICATION_DLQ)
    private readonly dlq: Queue<NotificationJobData>,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly mainQueue: Queue<NotificationJobData>,
  ) {}

  // ----------------------------------------------------------------- list
  @Get()
  async list(
    @Query('start') start = '0',
    @Query('end') end = '49',
  ): Promise<{ total: number; jobs: DlqJobView[] }> {
    const [jobs, total] = await Promise.all([
      this.dlq.getJobs(
        ['waiting', 'completed', 'failed', 'delayed'],
        +start,
        +end,
      ),
      this.dlq.count(),
    ]);

    return { total, jobs: jobs.map(toView) };
  }

  // ----------------------------------------------------------------- get one
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<DlqJobView> {
    const job = await this.dlq.getJob(id);
    if (!job) throw new NotFoundException(`DLQ job ${id} not found`);
    return toView(job);
  }

  // ----------------------------------------------------------------- retry
  @Post(':id/retry')
  async retry(
    @Param('id') id: string,
  ): Promise<{ message: string; newJobId: string | number | undefined }> {
    const dlqJob = await this.dlq.getJob(id);
    if (!dlqJob) throw new NotFoundException(`DLQ job ${id} not found`);

    // Strip _meta so the job processes cleanly
    const { _meta, ...payload } = dlqJob.data;
    const newJob = await this.mainQueue.add('send-notification', payload);

    await dlqJob.remove();

    return { message: 'Re-enqueued for reprocessing', newJobId: newJob.id };
  }

  // ----------------------------------------------------------------- delete one
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    const job = await this.dlq.getJob(id);
    if (!job) throw new NotFoundException(`DLQ job ${id} not found`);
    await job.remove();
    return { message: `DLQ job ${id} removed` };
  }

  // ----------------------------------------------------------------- drain all
  @Delete()
  async drain(): Promise<{ message: string }> {
    await this.dlq.empty();
    return { message: 'DLQ drained' };
  }
}
