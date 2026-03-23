// src/word-progress/word-progress.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IUser } from 'src/common/interfaces';
import { MemoryStatus } from '@prisma/client';

export interface ReviewResultDto {
  /** 0=Blackout, 1=Wrong, 2=Hard, 3=Good, 4=Easy (SM-2 quality score) */
  quality: 0 | 1 | 2 | 3 | 4 | 5;
  wordId?: string;
  userWordId?: string;
}

/**
 * SM-2 Algorithm
 * https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-achieved-in-working-with-the-supermemo-method
 */
function sm2(
  repetitions: number,
  easeFactor: number,
  intervalDays: number,
  quality: number,
): {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
} {
  let newRepetitions = repetitions;
  let newEF = easeFactor;
  let newInterval = intervalDays;

  if (quality >= 3) {
    // Đúng
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(intervalDays * easeFactor);

    newRepetitions = repetitions + 1;
  } else {
    // Sai — reset về đầu
    newRepetitions = 0;
    newInterval = 1;
  }

  // Cập nhật ease factor (không cho xuống dưới 1.3)
  newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEF = Math.max(1.3, newEF);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easeFactor: newEF,
    intervalDays: newInterval,
    nextReviewAt,
  };
}

function computeStatus(
  repetitions: number,
  intervalDays: number,
): MemoryStatus {
  if (repetitions === 0) return 'NEW';
  if (repetitions < 3) return 'LEARNING';
  if (intervalDays >= 21) return 'MASTERED';
  return 'REVIEWING';
}

@Injectable()
export class WordProgressService {
  constructor(private prisma: PrismaService) {}

  // Lấy tiến độ user (phân trang)
  async findAll(
    userId: string,
    current = 1,
    pageSize = 20,
    status?: MemoryStatus,
  ) {
    const skip = (current - 1) * pageSize;
    const where: any = { userId };
    if (status) where.status = status;

    const [total, result] = await Promise.all([
      this.prisma.wordProgress.count({ where }),
      this.prisma.wordProgress.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { nextReviewAt: 'asc' },
        include: {
          word: {
            select: {
              id: true,
              en: true,
              meaning: true,
              level: true,
              phonetic: true,
            },
          },
          userWord: {
            select: { id: true, en: true, meaning: true, level: true },
          },
        },
      }),
    ]);

    return {
      meta: { current, pageSize, pages: Math.ceil(total / pageSize), total },
      result,
    };
  }

  // Lấy từ cần ôn tập hôm nay
  async getDueToday(userId: string, limit = 20) {
    return this.prisma.wordProgress.findMany({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        status: { not: 'MASTERED' },
      },
      take: limit,
      orderBy: { nextReviewAt: 'asc' },
      include: {
        word: true,
        userWord: true,
      },
    });
  }

  // User bắt đầu học từ hệ thống (tạo progress record nếu chưa có)
  async startLearningWord(wordId: string, userId: string) {
    // upsert thay vì findUnique + create để tránh race condition (P2002)
    // Nếu đã có record thì không thay đổi gì (update rỗng), chỉ create khi chưa tồn tại
    return this.prisma.wordProgress.upsert({
      where: { userId_wordId: { userId, wordId } },
      update: {}, // Không đổi gì nếu đã tồn tại
      create: {
        userId,
        wordId,
        source: 'SYSTEM',
        status: 'NEW', // Chỉ LEARNING khi user đã nhấn đánh giá (submitReview)
      },
    });
  }

  // Xử lý kết quả ôn tập — áp dụng SM-2
  async submitReview(dto: ReviewResultDto, userId: string) {
    const { quality, wordId, userWordId } = dto;

    if (!wordId && !userWordId) {
      throw new BadRequestException('Phải cung cấp wordId hoặc userWordId!');
    }

    // Tìm progress record
    const where: any = { userId };
    if (wordId) where.wordId = wordId;
    if (userWordId) where.userWordId = userWordId;

    const progress = await this.prisma.wordProgress.findFirst({ where });
    if (!progress)
      throw new BadRequestException('Chưa học từ này, không thể ôn tập!');

    // Tính SM-2
    const { repetitions, easeFactor, intervalDays, nextReviewAt } = sm2(
      progress.repetitions,
      progress.easeFactor,
      progress.intervalDays,
      quality,
    );
    const status = computeStatus(repetitions, intervalDays);
    const isCorrect = quality >= 3;

    const updated = await this.prisma.wordProgress.update({
      where: { id: progress.id },
      data: {
        repetitions,
        easeFactor,
        intervalDays,
        nextReviewAt,
        status,
        correctCount: isCorrect ? { increment: 1 } : undefined,
        wrongCount: !isCorrect ? { increment: 1 } : undefined,
        lastReviewedAt: new Date(),
      },
    });

    return { ...updated, isCorrect, nextReviewAt };
  }

  // Thống kê tổng quan cho dashboard
  async getStats(userId: string) {
    const [byStatus, totalWords, masteredToday] = await Promise.all([
      this.prisma.wordProgress.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
      this.prisma.wordProgress.count({ where: { userId } }),
      this.prisma.wordProgress.count({
        where: {
          userId,
          status: 'MASTERED',
          lastReviewedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    const dueCount = await this.prisma.wordProgress.count({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        status: { not: 'MASTERED' },
      },
    });

    const stats = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count.id]),
    );

    return {
      total: totalWords,
      due: dueCount,
      masteredToday,
      NEW: stats['NEW'] ?? 0,
      LEARNING: stats['LEARNING'] ?? 0,
      REVIEWING: stats['REVIEWING'] ?? 0,
      MASTERED: stats['MASTERED'] ?? 0,
    };
  }
  // Tiến độ user theo từng Topic (% từ đã MASTERED hoặc REVIEWING)
  async getProgressByTopic(userId: string, topicId: string) {
    // Lấy tất cả wordId thuộc topic
    const wordTopics = await this.prisma.wordTopic.findMany({
      where: { topicId },
      select: { wordId: true },
    });
    const wordIds = wordTopics.map((wt) => wt.wordId);
    if (wordIds.length === 0)
      return { topicId, totalWords: 0, learnedWords: 0, progressPct: 0 };

    // Đếm từ đã THỰC SỰ ôn tập (có lastReviewedAt — đã nhấn đánh giá ít nhất 1 lần)
    const reviewedCount = await this.prisma.wordProgress.count({
      where: {
        userId,
        wordId: { in: wordIds },
        lastReviewedAt: { not: null },
      },
    });

    const masteredCount = await this.prisma.wordProgress.count({
      where: {
        userId,
        wordId: { in: wordIds },
        status: 'MASTERED',
      },
    });

    const progressPct =
      wordIds.length > 0
        ? Math.round((reviewedCount / wordIds.length) * 100)
        : 0;

    return {
      topicId,
      totalWords: wordIds.length,
      learnedWords: reviewedCount, // số từ đã ôn = đã nhấn đánh giá
      masteredWords: masteredCount,
      progressPct,
    };
  }

  // Tiến độ user theo Level
  async getProgressByLevel(userId: string, level: string) {
    const words = await this.prisma.word.findMany({
      where: { level: level as any, isActive: true },
      select: { id: true },
    });
    const wordIds = words.map((w) => w.id);
    if (wordIds.length === 0)
      return { level, totalWords: 0, learnedWords: 0, progressPct: 0 };

    const reviewedCount = await this.prisma.wordProgress.count({
      where: {
        userId,
        wordId: { in: wordIds },
        lastReviewedAt: { not: null },
      },
    });

    const masteredCount = await this.prisma.wordProgress.count({
      where: {
        userId,
        wordId: { in: wordIds },
        status: 'MASTERED',
      },
    });

    return {
      level,
      totalWords: wordIds.length,
      learnedWords: reviewedCount,
      masteredWords: masteredCount,
      progressPct: Math.round((reviewedCount / wordIds.length) * 100),
    };
  }

  // Lấy tiến độ tất cả topics cùng lúc (dùng cho TopicTab)
  async getAllTopicProgress(userId: string) {
    const topics = await this.prisma.topic.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const results = await Promise.all(
      topics.map((t) => this.getProgressByTopic(userId, t.id)),
    );
    // Trả về map topicId → progressPct
    return Object.fromEntries(results.map((r) => [r.topicId, r]));
  }

  // Lấy tiến độ tất cả levels cùng lúc (dùng cho LevelTab)
  async getAllLevelProgress(userId: string) {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const results = await Promise.all(
      levels.map((l) => this.getProgressByLevel(userId, l)),
    );
    return Object.fromEntries(results.map((r) => [r.level, r]));
  }
}
