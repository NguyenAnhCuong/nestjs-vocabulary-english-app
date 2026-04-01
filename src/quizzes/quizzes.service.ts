// src/quizzes/quizzes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateQuizDto,
  UpdateQuizDto,
  FilterQuizDto,
  SubmitAttemptDto,
} from './dto/create-quiz.dto';
import type { IUser } from 'src/common/interfaces';

const GRADE_LABELS: Record<string, string> = {
  S: 'Xuất sắc 🏆',
  A: 'Giỏi 🎉',
  B: 'Khá tốt 👍',
  C: 'Trung bình 🙂',
  F: 'Cần cố gắng 💪',
};

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  // ── Create ──────────────────────────────────────────────────────────────────
  async create(dto: CreateQuizDto, user?: IUser) {
    const {
      pronunciationQuestions,
      vocabularyQuestions,
      readingQuestion,
      tags,
      durationMinutes = 30,
      ...quizData
    } = dto;
    const totalQuestions =
      pronunciationQuestions.length +
      vocabularyQuestions.length +
      readingQuestion.blanks.length;

    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          ...quizData,
          durationMinutes,
          tags: tags ?? [],
          totalQuestions,
          createdBy: user?.id,
        },
      });

      for (const q of pronunciationQuestions) {
        await tx.quizQuestion.create({
          data: {
            quizId: quiz.id,
            type: 'pronunciation',
            order: q.order,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
            meta: q.phonetics ? { phonetics: q.phonetics } : undefined,
          },
        });
      }
      for (const q of vocabularyQuestions) {
        await tx.quizQuestion.create({
          data: {
            quizId: quiz.id,
            type: 'vocabulary',
            order: q.order,
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
          },
        });
      }
      const rq = await tx.quizQuestion.create({
        data: {
          quizId: quiz.id,
          type: 'reading_blank',
          order: readingQuestion.order,
          question: readingQuestion.title,
          passage: readingQuestion.passage,
          options: [],
          answer: '',
          meta: { title: readingQuestion.title },
        },
      });
      for (let i = 0; i < readingQuestion.blanks.length; i++) {
        const b = readingQuestion.blanks[i];
        await tx.readingBlank.create({
          data: {
            questionId: rq.id,
            label: b.label,
            options: b.options,
            answer: b.answer,
            order: i + 1,
          },
        });
      }
      return quiz;
    });
  }

  // ── Find all ────────────────────────────────────────────────────────────────
  async findAll(filter: FilterQuizDto = {}) {
    const { current = 1, pageSize = 6, level, search, isPublished } = filter;
    const skip = (current - 1) * pageSize;
    const where: any = {};
    if (level) where.level = level;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (search)
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];

    const [total, quizzes] = await Promise.all([
      this.prisma.quiz.count({ where }),
      this.prisma.quiz.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { attempts: true } },
          attempts: {
            select: { score: true },
            orderBy: { submittedAt: 'desc' },
            take: 100,
          },
        },
      }),
    ]);

    const result = quizzes.map((q) => {
      const scores = q.attempts
        .map((a) => (a.score as any)?.percentScore as number | undefined)
        .filter((s): s is number => s !== undefined);
      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : null;
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        level: q.level,
        durationMinutes: q.durationMinutes,
        totalQuestions: q.totalQuestions,
        tags: q.tags,
        isPublished: q.isPublished,
        createdAt: q.createdAt.toISOString().split('T')[0],
        attemptCount: q._count.attempts,
        avgScore,
      };
    });

    return {
      meta: { current, pageSize, total, pages: Math.ceil(total / pageSize) },
      result,
    };
  }

  // ── Find one ────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: { blanks: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!quiz) throw new NotFoundException(`Quiz "${id}" không tồn tại`);

    const pronQ = quiz.questions.filter((q) => q.type === 'pronunciation');
    const vocabQ = quiz.questions.filter((q) => q.type === 'vocabulary');
    const readingQ = quiz.questions.find((q) => q.type === 'reading_blank');

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      level: quiz.level,
      durationMinutes: quiz.durationMinutes,
      totalQuestions: quiz.totalQuestions,
      tags: quiz.tags,
      pronunciationQuestions: pronQ.map((q) => ({
        id: q.id,
        type: 'pronunciation' as const,
        order: q.order,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        phonetics: (q.meta as any)?.phonetics,
      })),
      vocabularyQuestions: vocabQ.map((q) => ({
        id: q.id,
        type: 'vocabulary' as const,
        order: q.order,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      })),
      readingQuestion: readingQ
        ? {
            id: readingQ.id,
            type: 'reading_blank' as const,
            order: readingQ.order,
            title: (readingQ.meta as any)?.title ?? readingQ.question,
            passage: readingQ.passage ?? '',
            blanks: readingQ.blanks.map((b) => ({
              id: b.id,
              label: b.label,
              options: b.options,
              answer: b.answer,
            })),
          }
        : null,
    };
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateQuizDto) {
    await this.findOne(id);
    const {
      pronunciationQuestions,
      vocabularyQuestions,
      readingQuestion,
      tags,
      ...quizData
    } = dto;
    return this.prisma.quiz.update({
      where: { id },
      data: { ...quizData, ...(tags !== undefined && { tags }) },
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.quiz.delete({ where: { id } });
  }

  // ── Toggle publish ──────────────────────────────────────────────────────────
  async togglePublish(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      select: { isPublished: true },
    });
    if (!quiz) throw new NotFoundException(`Quiz "${id}" không tồn tại`);
    return this.prisma.quiz.update({
      where: { id },
      data: { isPublished: !quiz.isPublished },
      select: { id: true, isPublished: true },
    });
  }

  // ── Submit & grade ──────────────────────────────────────────────────────────
  async submitAttempt(
    dto: SubmitAttemptDto & { quizId: string },
    userId: string,
  ) {
    const { quizId, answers, timeTakenSeconds } = dto;

    // ✅ Guard: answers phải là object hợp lệ
    if (!answers || typeof answers !== 'object') {
      throw new Error('answers is required and must be an object');
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { include: { blanks: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz không tồn tại');

    const pronQ = quiz.questions.filter((q) => q.type === 'pronunciation');
    const vocabQ = quiz.questions.filter((q) => q.type === 'vocabulary');
    const readingQ = quiz.questions.find((q) => q.type === 'reading_blank');

    let pronCorrect = 0,
      vocabCorrect = 0,
      readingCorrect = 0;

    pronQ.forEach((q) => {
      if (answers[q.id] === q.answer) pronCorrect++;
    });
    vocabQ.forEach((q) => {
      if (answers[q.id] === q.answer) vocabCorrect++;
    });
    readingQ?.blanks.forEach((b) => {
      if (answers[b.id] === b.answer) readingCorrect++;
    });

    const totalCorrect = pronCorrect + vocabCorrect + readingCorrect;
    const totalQuestions =
      pronQ.length + vocabQ.length + (readingQ?.blanks.length ?? 0);
    const percentScore =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    // ✅ Grade as explicit string key
    const grade: 'S' | 'A' | 'B' | 'C' | 'F' =
      percentScore >= 90
        ? 'S'
        : percentScore >= 80
          ? 'A'
          : percentScore >= 65
            ? 'B'
            : percentScore >= 50
              ? 'C'
              : 'F';

    const score = {
      totalCorrect,
      totalQuestions,
      percentScore,
      grade,
      gradeLabel: GRADE_LABELS[grade], // ✅ dùng Record thay vì object literal indexing
      timeTakenSeconds,
      sections: [
        {
          label: 'Phát âm',
          icon: '🔊',
          correct: pronCorrect,
          total: pronQ.length,
        },
        {
          label: 'Từ vựng',
          icon: '📖',
          correct: vocabCorrect,
          total: vocabQ.length,
        },
        {
          label: 'Đọc hiểu',
          icon: '📰',
          correct: readingCorrect,
          total: readingQ?.blanks.length ?? 0,
        },
      ],
    };

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        answers: answers as any, // ✅ Prisma Json field
        score: score as any,
        timeTakenSeconds,
      },
    });

    return { attemptId: attempt.id, score };
  }

  // ── My attempts for 1 quiz ──────────────────────────────────────────────────
  async getMyAttempts(quizId: string, userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId, userId },
      select: {
        id: true,
        score: true,
        timeTakenSeconds: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    });
  }

  // ── Attempt history (all quizzes) ───────────────────────────────────────────
  async getAttemptHistory(userId: string, current = 1, pageSize = 10) {
    const skip = (current - 1) * pageSize;
    const where = { userId };
    const [total, result] = await Promise.all([
      this.prisma.quizAttempt.count({ where }),
      this.prisma.quizAttempt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { submittedAt: 'desc' },
        include: { quiz: { select: { id: true, title: true, level: true } } },
      }),
    ]);
    return {
      meta: { current, pageSize, total, pages: Math.ceil(total / pageSize) },
      result,
    };
  }
}
