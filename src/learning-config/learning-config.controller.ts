// src/learning-config/learning-config.controller.ts
import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  LearningConfigService,
  UpsertLearningConfigDto,
} from './learning-config.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';

@Controller('learning-config')
export class LearningConfigController {
  constructor(private readonly service: LearningConfigService) {}

  @Get()
  @ResponseMessage('Lấy cài đặt học tập')
  get(@User() user: IUser) {
    return this.service.get(user.id);
  }

  @Put()
  @ResponseMessage('Cập nhật cài đặt học tập')
  upsert(@Body() dto: UpsertLearningConfigDto, @User() user: IUser) {
    return this.service.upsert(dto, user.id);
  }
}
