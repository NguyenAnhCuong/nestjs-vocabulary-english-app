// src/word-progress/word-progress.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WordProgressService, ReviewResultDto } from './word-progress.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MemoryStatus } from '@prisma/client';

class SubmitReviewDto implements ReviewResultDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  quality: 0 | 1 | 2 | 3 | 4 | 5;

  @IsOptional()
  @IsString()
  wordId?: string;

  @IsOptional()
  @IsString()
  userWordId?: string;
}

class StartLearningDto {
  @IsString()
  wordId: string;
}

@Controller('word-progress')
export class WordProgressController {
  constructor(private readonly service: WordProgressService) {}

  @Get()
  @ResponseMessage('Lấy tiến độ học từ')
  findAll(
    @User() user: IUser,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('status') status: MemoryStatus,
  ) {
    return this.service.findAll(
      user.id,
      +current || 1,
      +pageSize || 20,
      status,
    );
  }

  @Get('due')
  @ResponseMessage('Lấy từ cần ôn tập hôm nay')
  getDueToday(@User() user: IUser, @Query('limit') limit: string) {
    return this.service.getDueToday(user.id, +limit || 20);
  }

  @Get('stats')
  @ResponseMessage('Thống kê tiến độ học')
  getStats(@User() user: IUser) {
    return this.service.getStats(user.id);
  }

  @Post('start')
  @ResponseMessage('Bắt đầu học từ')
  startLearning(@Body() dto: StartLearningDto, @User() user: IUser) {
    return this.service.startLearningWord(dto.wordId, user.id);
  }

  @Post('review')
  @ResponseMessage('Nộp kết quả ôn tập')
  submitReview(@Body() dto: SubmitReviewDto, @User() user: IUser) {
    return this.service.submitReview(dto, user.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// src/word-progress/word-progress.module.ts
import { Module } from '@nestjs/common';

@Module({
  controllers: [WordProgressController],
  providers: [WordProgressService],
  exports: [WordProgressService],
})
export class WordProgressModule {}
