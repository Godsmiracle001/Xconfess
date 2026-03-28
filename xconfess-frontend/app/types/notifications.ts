export enum NotificationType {
  REACTION = "reaction",
  COMMENT = "comment",
  TIP = "tip",
  BADGE = "badge",
  MENTION = "mention",
  FOLLOW = "follow",
}

export interface NotificationMetadata {
  confessionId?: string;
  commentId?: string;
  tipId?: string;
  badgeId?: string;
  actorUsername?: string;
  actorId?: string;
  amount?: number;
  reactionType?: string;
  badgeName?: string;
  url?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  reaction: boolean;
  comment: boolean;
  tip: boolean;
  badge: boolean;
  mention: boolean;
  follow: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface NotificationFilter {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}
