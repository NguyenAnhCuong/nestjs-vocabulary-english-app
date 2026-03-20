// src/user-goals/user-goals.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  UserGoalsService,
  CreateUserGoalDto,
  IncrementGoalDto,
} from './user-goals.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';

@Controller('user-goals')
export class UserGoalsController {
  constructor(private readonly service: UserGoalsService) {}

  @Post()
  @ResponseMessage('Tạo mục tiêu học tập')
  create(@Body() dto: CreateUserGoalDto, @User() user: IUser) {
    return this.service.create(dto, user.id);
  }

  @Get('today')
  @ResponseMessage('Lấy mục tiêu hôm nay')
  getToday(@User() user: IUser) {
    return this.service.getToday(user.id);
  }

  @Post('today/seed')
  @ResponseMessage('Khởi tạo mục tiêu hàng ngày')
  seedToday(@User() user: IUser) {
    return this.service.seedDailyGoals(user.id);
  }

  @Post('increment')
  @ResponseMessage('Cập nhật tiến độ mục tiêu')
  increment(@Body() dto: IncrementGoalDto, @User() user: IUser) {
    return this.service.increment(dto, user.id);
  }

  @Get()
  @ResponseMessage('Lấy mục tiêu theo ngày')
  getByDate(@User() user: IUser, @Query('date') date: string) {
    return this.service.getByDate(user.id, date ? new Date(date) : undefined);
  }
}
