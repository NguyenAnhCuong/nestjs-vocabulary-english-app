// src/learning-config/learning-config.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CefrLevel } from '../generated/prisma/enums';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertLearningConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  dailyNewWordTarget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  dailyMinuteTarget?: number;

  @IsOptional()
  @IsEnum(CefrLevel)
  currentLevel?: CefrLevel;

  @IsOptional()
  @IsEnum(CefrLevel)
  targetLevel?: CefrLevel;

  @IsOptional()
  @IsString()
  reminderTime?: string; // "08:00"

  @IsOptional()
  @IsBoolean()
  notificationsOn?: boolean;

  @IsOptional()
  @IsString()
  uiLanguage?: string;
}

@Injectable()
export class LearningConfigService {
  constructor(private prisma: PrismaService) {}

  // Lấy config — nếu chưa có thì tạo default
  async get(userId: string) {
    return this.prisma.learningConfig.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  // Update / create config
  async upsert(dto: UpsertLearningConfigDto, userId: string) {
    return this.prisma.learningConfig.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto },
    });
  }
}
