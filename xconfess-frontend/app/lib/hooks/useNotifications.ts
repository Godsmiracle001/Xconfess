"use client";

import {
    NotificationFilter,
    PaginatedNotifications,
} from "@/app/types/notifications";
import type { Notification } from "@/app/types/notifications";
import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { notificationApi } from "@/app/lib/api/notification";
import { useApiError } from "@/app/lib/hooks/useApiError";
import { getWsUrl } from "@/app/lib/config";

const WS_URL = getWsUrl();

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: (filter?: NotificationFilter) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  playNotificationSound: () => void;
}

export function useNotifications(userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { handleError } = useApiError({ context: 'Notifications' });

  // Initialize notification sound
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/notification.mp3");
      audioRef.current.volume = 0.5;
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.log("Could not play notification sound:", err);
      });
    }
  }, []);

  const fetchNotifications = useCallback(
    async (filter?: NotificationFilter) => {
      setLoading(true);
      try {
        const data = await notificationApi.getNotifications(filter);

        if (filter?.page && filter.page > 1) {
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }

        setUnreadCount(data.unreadCount);
      } catch (error) {
        handleError(error, 'Unable to load notifications. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      handleError(error, 'Unable to mark notification as read. Please try again.');
    }
  }, [handleError]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      handleError(error, 'Unable to mark all notifications as read. Please try again.');
    }
  }, [handleError]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationApi.deleteNotification(notificationId);

      setNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationId)
      );
    } catch (error) {
      handleError(error, 'Unable to delete notification. Please try again.');
    }
  }, [handleError]);

  // WebSocket connection
  useEffect(() => {
    if (!userId) return;

    // get auth token from our client or cookies - we'll just omit it if the socket relies on cookies
    // Or we keep AUTH_TOKEN_KEY usage ONLY for websocket
    const token = localStorage.getItem("auth_token");

    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      // Join user's notification room
      socket.emit("join-notifications", userId);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });

    socket.on("notification", (notification: Notification) => {
      console.log("New notification received:", notification);

      // Add to notifications list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Play sound and show browser notification
      playNotificationSound();

      // Show browser notification if permitted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/icons/notification-icon.png",
          badge: "/icons/badge-icon.png",
        });
      }
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, [userId, playNotificationSound]);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    loading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    deleteNotification,
    playNotificationSound,
  };
}
