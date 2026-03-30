// src/word-progress/word-progress.controller.ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WordProgressService, ReviewResultDto } from './word-progress.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { MemoryStatus } from '../generated/prisma/enums';
import type { IUser } from 'src/common/interfaces';

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

  @Get('topic/:topicId')
  @ResponseMessage('Tiến độ theo chủ đề')
  getProgressByTopic(@Param('topicId') topicId: string, @User() user: IUser) {
    return this.service.getProgressByTopic(user.id, topicId);
  }

  @Get('level/:level')
  @ResponseMessage('Tiến độ theo cấp độ')
  getProgressByLevel(@Param('level') level: string, @User() user: IUser) {
    return this.service.getProgressByLevel(user.id, level);
  }

  @Get('all-topics')
  @ResponseMessage('Tiến độ tất cả chủ đề')
  getAllTopicProgress(@User() user: IUser) {
    return this.service.getAllTopicProgress(user.id);
  }

  @Get('all-levels')
  @ResponseMessage('Tiến độ tất cả cấp độ')
  getAllLevelProgress(@User() user: IUser) {
    return this.service.getAllLevelProgress(user.id);
  }
}
