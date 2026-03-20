// src/word-progress/word-progress.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
    const exists = await this.prisma.wordProgress.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
    if (exists) return exists;

    return this.prisma.wordProgress.create({
      data: {
        userId,
        wordId,
        source: 'SYSTEM',
        status: 'LEARNING',
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
}
