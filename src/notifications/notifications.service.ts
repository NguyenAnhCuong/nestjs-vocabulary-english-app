// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { IUser } from 'src/common/interfaces';

export type NotificationType =
  | 'streak_reminder'
  | 'quiz_available'
  | 'goal_completed'
  | 'level_up'
  | 'review_due';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Internal: tạo notification từ các service khác
  async createOne(data: CreateNotificationData) {
    return this.prisma.notification.create({ data });
  }

  async findAll(
    userId: string,
    current = 1,
    pageSize = 20,
    onlyUnread = false,
  ) {
    const skip = (current - 1) * pageSize;
    const where: any = { userId };
    if (onlyUnread) where.isRead = false;

    const [total, result] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      meta: { current, pageSize, pages: Math.ceil(total / pageSize), total },
      unreadCount,
      result,
    };
  }

  // Đánh dấu 1 notification đã đọc
  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Đánh dấu tất cả đã đọc
  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteOne(id: string, userId: string) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }

  // Helpers: tạo các loại notification cụ thể
  async notifyStreakReminder(userId: string, streak: number) {
    return this.createOne({
      userId,
      type: 'streak_reminder',
      title: 'Đừng quên học hôm nay! 🔥',
      body: `Bạn đang có chuỗi ${streak} ngày liên tiếp. Học ngay để không bị mất streak!`,
      metadata: { streak },
    });
  }

  async notifyGoalCompleted(userId: string, goalType: string) {
    const labels: Record<string, string> = {
      daily_words: 'từ mới hàng ngày',
      daily_minutes: 'thời gian học hàng ngày',
      streak_days: 'chuỗi ngày học',
    };
    return this.createOne({
      userId,
      type: 'goal_completed',
      title: 'Hoàn thành mục tiêu! 🎯',
      body: `Bạn đã đạt mục tiêu ${labels[goalType] ?? goalType} hôm nay. Tuyệt vời!`,
      metadata: { goalType },
    });
  }

  async notifyLevelUp(userId: string, newLevel: string) {
    return this.createOne({
      userId,
      type: 'level_up',
      title: `Lên cấp ${newLevel}! 🎉`,
      body: `Chúc mừng bạn đã đạt cấp độ ${newLevel}. Hãy tiếp tục chinh phục!`,
      metadata: { newLevel },
    });
  }
}
