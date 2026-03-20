// src/quizzes/quizzes.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import type { IUser } from 'src/common/interfaces';
import { CefrLevel, QuizResult } from '@prisma/client';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  userAnswer?: string;
}

export class SubmitAttemptDto {
  @IsString()
  quizId: string;

  @IsOptional()
  timeTaken?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers: SubmitAnswerDto[];
}

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateQuizDto) {
    const { questions, ...quizData } = dto;

    const totalPoints =
      questions?.reduce((sum, q) => sum + (q.points ?? 1), 0) ?? 0;

    return this.prisma.quiz.create({
      data: {
        ...quizData,
        totalPoints,
        questions: questions?.length
          ? {
              create: questions.map((q, i) => ({
                ...q,
                points: q.points ?? 1,
                sortOrder: q.sortOrder ?? i,
              })),
            }
          : undefined,
      },
      include: { questions: true },
    });
  }

  async findAll(
    current = 1,
    pageSize = 10,
    level?: CefrLevel,
    topicId?: string,
  ) {
    const skip = (current - 1) * pageSize;
    const where: any = { isPublished: true };
    if (level) where.level = level;
    if (topicId) where.topicId = topicId;

    const [total, result] = await Promise.all([
      this.prisma.quiz.count({ where }),
      this.prisma.quiz.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { questions: true, attempts: true } } },
      }),
    ]);

    return {
      meta: { current, pageSize, pages: Math.ceil(total / pageSize), total },
      result,
    };
  }

  async findOne(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { attempts: true } },
      },
    });
    if (!quiz) throw new BadRequestException('Quiz không tồn tại!');
    return quiz;
  }

  async update(id: string, dto: Partial<CreateQuizDto>) {
    await this.findOne(id);
    const { questions, ...quizData } = dto;
    return this.prisma.quiz.update({ where: { id }, data: quizData });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.quiz.delete({ where: { id } });
  }

  /**
   * User nộp bài quiz:
   * 1. Tạo QuizAttempt
   * 2. Chấm điểm từng câu so với đáp án
   * 3. Tạo QuizAnswer cho từng câu
   * 4. Tự động cập nhật WordProgress cho các từ trong quiz
   */
  async submitAttempt(dto: SubmitAttemptDto, userId: string) {
    const quiz = await this.findOne(dto.quizId);

    // Map câu hỏi theo id để chấm nhanh
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    let totalScore = 0;
    const answersData: {
      questionId: string;
      userAnswer: string | null;
      result: QuizResult;
      pointsEarned: number;
    }[] = [];

    for (const ans of dto.answers) {
      const question = questionMap.get(ans.questionId);
      if (!question) continue;

      const isCorrect =
        ans.userAnswer?.trim().toLowerCase() ===
        question.answer.trim().toLowerCase();
      const result: QuizResult = !ans.userAnswer
        ? 'SKIPPED'
        : isCorrect
          ? 'CORRECT'
          : 'INCORRECT';
      const pointsEarned = isCorrect ? question.points : 0;
      totalScore += pointsEarned;

      answersData.push({
        questionId: ans.questionId,
        userAnswer: ans.userAnswer ?? null,
        result,
        pointsEarned,
      });
    }

    // Tạo attempt + answers trong 1 transaction
    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.quizAttempt.create({
        data: {
          userId,
          quizId: dto.quizId,
          score: totalScore,
          totalPoints: quiz.totalPoints,
          timeTaken: dto.timeTaken,
          completedAt: new Date(),
          answers: {
            create: answersData,
          },
        },
        include: { answers: true },
      });

      // Cập nhật WordProgress: đúng = quality 4, sai = quality 1
      for (const ans of answersData) {
        const question = questionMap.get(ans.questionId);
        if (!question?.wordId) continue;
        const quality = ans.result === 'CORRECT' ? 4 : 1;

        const progress = await tx.wordProgress.findUnique({
          where: { userId_wordId: { userId, wordId: question.wordId } },
        });
        if (!progress) continue;

        const newEF = Math.max(
          1.3,
          progress.easeFactor +
            (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
        );
        const newRep = quality >= 3 ? progress.repetitions + 1 : 0;
        const newInterval =
          quality >= 3
            ? newRep === 1
              ? 1
              : newRep === 2
                ? 6
                : Math.round(progress.intervalDays * progress.easeFactor)
            : 1;
        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

        await tx.wordProgress.update({
          where: { id: progress.id },
          data: {
            repetitions: newRep,
            easeFactor: newEF,
            intervalDays: newInterval,
            nextReviewAt,
            correctCount:
              ans.result === 'CORRECT' ? { increment: 1 } : undefined,
            wrongCount:
              ans.result === 'INCORRECT' ? { increment: 1 } : undefined,
            lastReviewedAt: new Date(),
          },
        });
      }

      return created;
    });

    const percentage =
      quiz.totalPoints > 0
        ? Math.round((totalScore / quiz.totalPoints) * 100)
        : 0;

    return { ...attempt, percentage };
  }

  async getAttemptHistory(userId: string, current = 1, pageSize = 10) {
    const skip = (current - 1) * pageSize;
    const where = { userId };

    const [total, result] = await Promise.all([
      this.prisma.quizAttempt.count({ where }),
      this.prisma.quizAttempt.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          quiz: { select: { id: true, title: true, totalPoints: true } },
          _count: { select: { answers: true } },
        },
      }),
    ]);

    return {
      meta: { current, pageSize, pages: Math.ceil(total / pageSize), total },
      result,
    };
  }

  // Tự động tạo quiz từ các từ của user cần ôn
  async generateAutoQuiz(userId: string, count = 10, level?: CefrLevel) {
    const where: any = {
      userId,
      nextReviewAt: { lte: new Date() },
      status: { not: 'MASTERED' },
      word: { isNot: null },
    };
    if (level) where.word = { ...where.word, level };

    const progresses = await this.prisma.wordProgress.findMany({
      where,
      take: count,
      orderBy: { nextReviewAt: 'asc' },
      include: { word: true },
    });

    if (progresses.length === 0) {
      throw new BadRequestException('Không có từ nào cần ôn tập!');
    }

    const questions = progresses
      .filter((p) => p.word)
      .map((p, i) => ({
        wordId: p.wordId!,
        questionText: `"${p.word!.en}" có nghĩa là gì?`,
        questionType: 'multiple_choice',
        answer: p.word!.meaning,
        points: 1,
        sortOrder: i,
      }));

    return this.create({
      title: `Quiz tự động - ${new Date().toLocaleDateString('vi-VN')}`,
      isPublished: false,
      level,
      questions,
    });
  }
}
