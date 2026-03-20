// src/study-sessions/study-sessions.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  StudySessionsService,
  UpsertSessionDto,
} from './study-sessions.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

class UpsertStudySessionDto implements UpsertSessionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSecs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newWordsCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  xpEarned?: number;
}

@Controller('study-sessions')
export class StudySessionsController {
  constructor(private readonly service: StudySessionsService) {}

  // Gọi sau mỗi phiên học để cộng dồn dữ liệu
  @Post('today')
  @ResponseMessage('Cập nhật phiên học hôm nay')
  upsertToday(@Body() dto: UpsertStudySessionDto, @User() user: IUser) {
    return this.service.upsertToday(dto, user.id);
  }

  @Get('today')
  @ResponseMessage('Lấy thông tin phiên học hôm nay')
  getToday(@User() user: IUser) {
    return this.service.getToday(user.id);
  }

  @Get('streak')
  @ResponseMessage('Lấy streak hiện tại')
  getStreak(@User() user: IUser) {
    return this.service
      .getCurrentStreak(user.id)
      .then((streak) => ({ streak }));
  }

  @Get('history')
  @ResponseMessage('Lấy lịch sử học tập')
  getHistory(@User() user: IUser, @Query('days') days: string) {
    return this.service.getHistory(user.id, +days || 30);
  }

  @Get('dashboard')
  @ResponseMessage('Lấy thống kê dashboard')
  getDashboard(@User() user: IUser) {
    return this.service.getDashboardStats(user.id);
  }
}
