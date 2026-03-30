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
import { QuizzesService } from './quizzes.service';
import {
  CreateQuizDto,
  UpdateQuizDto,
  SubmitAttemptDto,
} from './dto/create-quiz.dto';
import { ResponseMessage, User, Public } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';
import { CefrLevel } from '../generated/prisma/enums';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly service: QuizzesService) {}

  // ── Public (không cần đăng nhập) ──────────────────────────────────────────

  @Get()
  @Public()
  @ResponseMessage('Lấy danh sách quiz')
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('level') level: CefrLevel,
    @Query('search') search: string,
    @Query('isPublished') isPublished: string,
  ) {
    return this.service.findAll({
      current: +current || 1,
      pageSize: +pageSize || 6,
      ...(level && { level }),
      ...(search && { search }),
      // Không truyền isPublished → trả tất cả (admin xem được cả bản nháp)
      ...(isPublished !== undefined && { isPublished: isPublished === 'true' }),
    });
  }

  @Get('me/history')
  @ResponseMessage('Lịch sử tất cả quiz đã làm')
  history(
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
  @Public()
  @ResponseMessage('Lấy chi tiết quiz')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ── Cần đăng nhập ──────────────────────────────────────────────────────────

  @Post(':id/submit')
  @ResponseMessage('Nộp bài và tính điểm')
  submit(
    @Param('id') quizId: string,
    @Body() dto: SubmitAttemptDto,
    @User() user: IUser,
  ) {
    // quizId từ URL override quizId trong body (phòng mismatch)
    return this.service.submitAttempt({ ...dto, quizId }, user.id);
  }

  @Get(':id/my-attempts')
  @ResponseMessage('Lịch sử làm bài')
  myAttempts(@Param('id') quizId: string, @User() user: IUser) {
    return this.service.getMyAttempts(quizId, user.id);
  }

  // ── Admin only ──────────────────────────────────────────────────────────────

  @Post()
  @ResponseMessage('Tạo quiz mới')
  create(@Body() dto: CreateQuizDto, @User() user: IUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật quiz')
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/publish')
  @ResponseMessage('Thay đổi trạng thái xuất bản')
  togglePublish(@Param('id') id: string) {
    return this.service.togglePublish(id);
  }

  @Delete(':id')
  @ResponseMessage('Xoá quiz')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
