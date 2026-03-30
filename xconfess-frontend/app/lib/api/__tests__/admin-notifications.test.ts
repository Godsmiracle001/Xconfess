import { adminApi } from '../admin';
import apiClient from '../client';
import type { FailedJobsResponse, ReplayJobResponse } from '../../types/notification-jobs';

jest.mock('../client');

describe('Admin API - Notification Jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFailedNotificationJobs', () => {
    it('should fetch failed notification jobs with default parameters', async () => {
      const mockResponse: FailedJobsResponse = {
        jobs: [
          {
            id: 'job-1',
            name: 'comment-notification',
            attemptsMade: 3,
            maxAttempts: 3,
            failedReason: 'SMTP timeout',
            failedAt: '2024-02-20T10:00:00Z',
            createdAt: '2024-02-20T09:00:00Z',
            channel: 'email',
            recipientEmail: 'user@example.com',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await adminApi.getFailedNotificationJobs();

      expect(apiClient.get).toHaveBeenCalledWith('/admin/notifications/dlq', {
        params: {
          page: 1,
          limit: 20,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fetch failed notification jobs with custom filters', async () => {
      const mockResponse: FailedJobsResponse = {
        jobs: [],
        total: 0,
        page: 2,
        limit: 10,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const filter = {
        page: 2,
        limit: 10,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        minRetries: 2,
      };

      await adminApi.getFailedNotificationJobs(filter);

      expect(apiClient.get).toHaveBeenCalledWith('/admin/notifications/dlq', {
        params: {
          page: 2,
          limit: 10,
          failedAfter: new Date('2024-02-01').toISOString(),
          failedBefore: new Date('2024-02-28').toISOString(),
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Network error');
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(adminApi.getFailedNotificationJobs()).rejects.toThrow('Network error');
    });

    it('should return mock data when mock mode is enabled', async () => {
      // Enable mock mode
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key) => (key === 'adminMock' ? 'true' : null)),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      const result = await adminApi.getFailedNotificationJobs();

      expect(result.jobs).toBeDefined();
      expect(Array.isArray(result.jobs)).toBe(true);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should filter mock data by date range', async () => {
      // Enable mock mode
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key) => (key === 'adminMock' ? 'true' : null)),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const result = await adminApi.getFailedNotificationJobs({
        startDate: futureDate,
      });

      // Should filter out jobs that failed before the start date
      expect(result.jobs.length).toBe(0);
    });

    it('should paginate mock data correctly', async () => {
      // Enable mock mode
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key) => (key === 'adminMock' ? 'true' : null)),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      const result = await adminApi.getFailedNotificationJobs({
        page: 1,
        limit: 1,
      });

      expect(result.jobs.length).toBeLessThanOrEqual(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });
  });

  describe('replayFailedNotificationJob', () => {
    it('should replay a failed notification job', async () => {
      const mockResponse: ReplayJobResponse = {
        success: true,
        message: 'Job replayed successfully',
        jobId: 'job-123',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await adminApi.replayFailedNotificationJob('job-123');

      expect(apiClient.post).toHaveBeenCalledWith('/admin/notifications/dlq/job-123/replay', {
        reason: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should replay a failed notification job with reason', async () => {
      const mockResponse: ReplayJobResponse = {
        success: true,
        message: 'Job replayed successfully',
        jobId: 'job-123',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const reason = 'Manual retry after fixing SMTP configuration';
      await adminApi.replayFailedNotificationJob('job-123', reason);

      expect(apiClient.post).toHaveBeenCalledWith('/admin/notifications/dlq/job-123/replay', {
        reason,
      });
    });

    it('should handle replay errors', async () => {
      const error = new Error('Job not found');
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(adminApi.replayFailedNotificationJob('invalid-job')).rejects.toThrow(
        'Job not found'
      );
    });

    it('should return mock response when mock mode is enabled', async () => {
      // Enable mock mode
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn((key) => (key === 'adminMock' ? 'true' : null)),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      const result = await adminApi.replayFailedNotificationJob('job-123');

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('should handle concurrent replay requests', async () => {
      const mockResponse: ReplayJobResponse = {
        success: true,
        message: 'Job replayed successfully',
        jobId: 'job-123',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      // Fire multiple requests concurrently
      const promises = [
        adminApi.replayFailedNotificationJob('job-123'),
        adminApi.replayFailedNotificationJob('job-456'),
        adminApi.replayFailedNotificationJob('job-789'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(apiClient.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct filter types', async () => {
      const mockResponse: FailedJobsResponse = {
        jobs: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      // TypeScript should enforce these types at compile time
      const validFilter = {
        status: 'failed' as const,
        page: 1,
        limit: 20,
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        minRetries: 2,
      };

      await adminApi.getFailedNotificationJobs(validFilter);

      expect(apiClient.get).toHaveBeenCalled();
    });

    it('should return properly typed response', async () => {
      const mockResponse: FailedJobsResponse = {
        jobs: [
          {
            id: 'job-1',
            name: 'comment-notification',
            attemptsMade: 3,
            maxAttempts: 3,
            failedReason: 'SMTP timeout',
            failedAt: '2024-02-20T10:00:00Z',
            createdAt: '2024-02-20T09:00:00Z',
            channel: 'email',
            recipientEmail: 'user@example.com',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await adminApi.getFailedNotificationJobs();

      // TypeScript should infer these types correctly
      expect(typeof result.total).toBe('number');
      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(Array.isArray(result.jobs)).toBe(true);

      if (result.jobs.length > 0) {
        const job = result.jobs[0];
        expect(typeof job.id).toBe('string');
        expect(typeof job.attemptsMade).toBe('number');
        expect(typeof job.maxAttempts).toBe('number');
      }
    });
  });
});
