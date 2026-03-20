// src/quizzes/quizzes.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { QuizzesService, SubmitAttemptDto } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';
import { CefrLevel } from '@prisma/client';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly service: QuizzesService) {}

  @Post()
  @ResponseMessage('Tạo quiz mới')
  create(@Body() dto: CreateQuizDto) {
    return this.service.create(dto);
  }

  @Get()
  @ResponseMessage('Lấy danh sách quiz')
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('level') level: CefrLevel,
    @Query('topicId') topicId: string,
  ) {
    return this.service.findAll(+current || 1, +pageSize || 10, level, topicId);
  }

  @Get('auto-generate')
  @ResponseMessage('Tạo quiz tự động từ từ cần ôn')
  generateAuto(
    @User() user: IUser,
    @Query('count') count: string,
    @Query('level') level: CefrLevel,
  ) {
    return this.service.generateAutoQuiz(user.id, +count || 10, level);
  }

  @Get('attempts')
  @ResponseMessage('Lịch sử làm quiz')
  getAttempts(
    @User() user: IUser,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.service.getAttemptHistory(
      user.id,
      +current || 1,
      +pageSize || 10,
    );
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết quiz')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật quiz')
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuizDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Xoá quiz')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('submit')
  @ResponseMessage('Nộp bài quiz')
  submit(@Body() dto: SubmitAttemptDto, @User() user: IUser) {
    return this.service.submitAttempt(dto, user.id);
  }
}
