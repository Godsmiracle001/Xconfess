import type { Analytics, AuditLog, Report, User } from './admin';

function isoDaysAgo(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export const mockAdminData = {
  analytics: (): Analytics => ({
    overview: {
      totalUsers: 1240,
      activeUsers: 318,
      totalConfessions: 9875,
      totalReports: 42,
      bannedUsers: 7,
      hiddenConfessions: 19,
      deletedConfessions: 11,
    },
    reports: {
      byStatus: [
        { status: 'pending', count: '9' },
        { status: 'reviewing', count: '3' },
        { status: 'resolved', count: '24' },
        { status: 'dismissed', count: '6' },
      ],
      byType: [
        { type: 'spam', count: '14' },
        { type: 'harassment', count: '10' },
        { type: 'hate_speech', count: '4' },
        { type: 'inappropriate_content', count: '11' },
        { type: 'copyright', count: '1' },
        { type: 'other', count: '2' },
      ],
    },
    trends: {
      confessionsOverTime: Array.from({ length: 14 }).map((_, idx) => ({
        date: isoDaysAgo(13 - idx),
        count: String(120 + Math.floor(Math.random() * 60)),
      })),
    },
    period: {
      start: isoDaysAgo(30),
      end: new Date().toISOString(),
    },
  }),

  reports: (): Report[] => [
    {
      id: '11111111-1111-4111-8111-111111111111',
      confessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      confession: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        message: 'This is a sample confession used for UI testing.',
        created_at: isoDaysAgo(2),
      },
      reporterId: 12,
      reporter: { id: 12, username: 'reporter_12' },
      type: 'harassment',
      reason: 'Harassing language',
      status: 'pending',
      resolvedBy: null,
      resolver: undefined,
      resolvedAt: null,
      resolutionNotes: null,
      createdAt: isoDaysAgo(1),
      updatedAt: isoDaysAgo(1),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      confessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      confession: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        message: 'Buy followers at example dot com!!!',
        created_at: isoDaysAgo(5),
      },
      reporterId: null,
      reporter: undefined,
      type: 'spam',
      reason: 'Obvious spam',
      status: 'reviewing',
      resolvedBy: null,
      resolver: undefined,
      resolvedAt: null,
      resolutionNotes: null,
      createdAt: isoDaysAgo(0),
      updatedAt: isoDaysAgo(0),
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      confessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      confession: {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        message: 'This content was resolved already.',
        created_at: isoDaysAgo(8),
      },
      reporterId: 44,
      reporter: { id: 44, username: 'reporter_44' },
      type: 'inappropriate_content',
      reason: 'Graphic content',
      status: 'resolved',
      resolvedBy: 1,
      resolver: { id: 1, username: 'demo-admin' },
      resolvedAt: isoDaysAgo(6),
      resolutionNotes: 'Report resolved - Confession removed',
      createdAt: isoDaysAgo(7),
      updatedAt: isoDaysAgo(6),
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      confessionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      confession: {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        message: 'This report was dismissed.',
        created_at: isoDaysAgo(10),
      },
      reporterId: 22,
      reporter: { id: 22, username: 'reporter_22' },
      type: 'other',
      reason: 'Not sure',
      status: 'dismissed',
      resolvedBy: 1,
      resolver: { id: 1, username: 'demo-admin' },
      resolvedAt: isoDaysAgo(9),
      resolutionNotes: 'Report dismissed - No violation found',
      createdAt: isoDaysAgo(9),
      updatedAt: isoDaysAgo(9),
    },
  ],

  users: (): User[] => [
    {
      id: 1,
      username: 'demo-admin',
      isAdmin: true,
      is_active: true,
      createdAt: isoDaysAgo(200),
      updatedAt: isoDaysAgo(1),
    },
    {
      id: 12,
      username: 'reporter_12',
      isAdmin: false,
      is_active: true,
      createdAt: isoDaysAgo(90),
      updatedAt: isoDaysAgo(3),
    },
    {
      id: 44,
      username: 'reporter_44',
      isAdmin: false,
      is_active: false,
      createdAt: isoDaysAgo(130),
      updatedAt: isoDaysAgo(2),
    },
  ],

  auditLogs: (): AuditLog[] => [
    {
      id: 'aaaa1111-1111-4111-8111-111111111111',
      adminId: 1,
      admin: { id: 1, username: 'demo-admin' },
      action: 'report_resolved',
      entityType: 'report',
      entityId: '33333333-3333-4333-8333-333333333333',
      metadata: { reportType: 'inappropriate_content' },
      notes: 'Report resolved - Confession removed',
      ipAddress: '127.0.0.1',
      userAgent: 'MockAgent/1.0',
      createdAt: isoDaysAgo(6),
    },
    {
      id: 'bbbb2222-2222-4222-8222-222222222222',
      adminId: 1,
      admin: { id: 1, username: 'demo-admin' },
      action: 'user_banned',
      entityType: 'user',
      entityId: '44',
      metadata: { reason: 'Repeated violations' },
      notes: 'User banned - Repeated violations',
      ipAddress: '127.0.0.1',
      userAgent: 'MockAgent/1.0',
      createdAt: isoDaysAgo(2),
    },
  ],
};
