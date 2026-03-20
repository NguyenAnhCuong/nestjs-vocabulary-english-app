// src/user-goals/user-goals.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { IUser } from 'src/common/interfaces';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserGoalDto {
  @IsString()
  goalType: string; // 'daily_words' | 'daily_minutes' | 'weekly_words' | 'streak_days'

  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetValue: number;

  @IsOptional()
  goalDate?: Date;
}

export class IncrementGoalDto {
  @IsString()
  goalType: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount: number;
}

@Injectable()
export class UserGoalsService {
  constructor(private prisma: PrismaService) {}

  // Tạo goal (thường gọi khi user thay đổi mục tiêu trong LearningConfig)
  async create(dto: CreateUserGoalDto, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.userGoal.create({
      data: {
        userId,
        goalType: dto.goalType,
        targetValue: dto.targetValue,
        goalDate: dto.goalDate ?? today,
      },
    });
  }

  // Lấy goals theo ngày
  async getByDate(userId: string, date?: Date) {
    const target = date ?? new Date();
    target.setHours(0, 0, 0, 0);

    return this.prisma.userGoal.findMany({
      where: { userId, goalDate: target },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Lấy goals hôm nay
  async getToday(userId: string) {
    return this.getByDate(userId);
  }

  // Tăng currentValue — gọi sau mỗi lần user học từ / ôn tập
  async increment(dto: IncrementGoalDto, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goal = await this.prisma.userGoal.findFirst({
      where: {
        userId,
        goalType: dto.goalType,
        goalDate: today,
        isCompleted: false,
      },
    });
    if (!goal) return null;

    const newValue = Math.min(goal.currentValue + dto.amount, goal.targetValue);
    const isCompleted = newValue >= goal.targetValue;

    return this.prisma.userGoal.update({
      where: { id: goal.id },
      data: {
        currentValue: newValue,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      },
    });
  }

  // Seed daily goals cho user từ LearningConfig
  async seedDailyGoals(userId: string) {
    const config = await this.prisma.learningConfig.findUnique({
      where: { userId },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goalTypes = [
      {
        goalType: 'daily_words',
        targetValue: config?.dailyNewWordTarget ?? 10,
      },
      {
        goalType: 'daily_minutes',
        targetValue: config?.dailyMinuteTarget ?? 30,
      },
    ];

    // Chỉ tạo nếu chưa có
    await this.prisma.userGoal.createMany({
      data: goalTypes.map((g) => ({ ...g, userId, goalDate: today })),
      skipDuplicates: true,
    });

    return this.getToday(userId);
  }
}
