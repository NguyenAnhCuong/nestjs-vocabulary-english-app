// src/study-sessions/study-sessions.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { IUser } from 'src/common/interfaces';

export interface UpsertSessionDto {
  /** Số giây học thêm trong lần gọi này */
  durationSecs?: number;
  newWordsCount?: number;
  reviewCount?: number;
  xpEarned?: number;
}

@Injectable()
export class StudySessionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upsert session của ngày hôm nay.
   * Mỗi ngày chỉ có 1 bản ghi → cộng dồn số liệu.
   */
  async upsertToday(dto: UpsertSessionDto, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.studySession.upsert({
      where: { userId_studyDate: { userId, studyDate: today } },
      update: {
        durationSecs: { increment: dto.durationSecs ?? 0 },
        newWordsCount: { increment: dto.newWordsCount ?? 0 },
        reviewCount: { increment: dto.reviewCount ?? 0 },
        xpEarned: { increment: dto.xpEarned ?? 0 },
      },
      create: {
        userId,
        studyDate: today,
        durationSecs: dto.durationSecs ?? 0,
        newWordsCount: dto.newWordsCount ?? 0,
        reviewCount: dto.reviewCount ?? 0,
        xpEarned: dto.xpEarned ?? 0,
      },
    });
  }

  /** Lấy session hôm nay */
  async getToday(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.studySession.findUnique({
      where: { userId_studyDate: { userId, studyDate: today } },
    });
  }

  /** Lấy lịch sử N ngày gần nhất */
  async getHistory(userId: string, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    return this.prisma.studySession.findMany({
      where: { userId, studyDate: { gte: from } },
      orderBy: { studyDate: 'asc' },
    });
  }

  /**
   * Tính streak hiện tại (số ngày liên tiếp đã học).
   * Đi ngược từ hôm nay, đếm cho đến khi gặp ngày không có session.
   */
  async getCurrentStreak(userId: string): Promise<number> {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId },
      orderBy: { studyDate: 'desc' },
      select: { studyDate: true },
    });

    if (!sessions.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sessions.length; i++) {
      const sessionDate = new Date(sessions[i].studyDate);
      sessionDate.setHours(0, 0, 0, 0);

      const expected = new Date(today);
      expected.setDate(today.getDate() - i);

      if (sessionDate.getTime() === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /** Tổng hợp stats cho dashboard */
  async getDashboardStats(userId: string) {
    const [today, streak, weekSessions] = await Promise.all([
      this.getToday(userId),
      this.getCurrentStreak(userId),
      this.getHistory(userId, 7),
    ]);

    const weekTotal = weekSessions.reduce(
      (acc, s) => ({
        durationSecs: acc.durationSecs + s.durationSecs,
        newWordsCount: acc.newWordsCount + s.newWordsCount,
        reviewCount: acc.reviewCount + s.reviewCount,
        xpEarned: acc.xpEarned + s.xpEarned,
      }),
      { durationSecs: 0, newWordsCount: 0, reviewCount: 0, xpEarned: 0 },
    );

    return {
      today: today ?? {
        durationSecs: 0,
        newWordsCount: 0,
        reviewCount: 0,
        xpEarned: 0,
      },
      streak,
      week: {
        sessions: weekSessions,
        totals: weekTotal,
      },
    };
  }
}
