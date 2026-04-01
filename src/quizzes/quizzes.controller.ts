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

  // ─────────────────────────────────────────────────────────────────────────
  // QUAN TRỌNG: Các route tĩnh PHẢI đặt TRƯỚC route có param (:id)
  // Nếu không NestJS sẽ match 'me/history' vào ':id' → sai
  // ─────────────────────────────────────────────────────────────────────────

  // ── Static routes (no param) ────────────────────────────────────────────
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
      ...(isPublished !== undefined && { isPublished: isPublished === 'true' }),
    });
  }

  // ✅ PHẢI đặt trước @Get(':id')
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

  @Post()
  @ResponseMessage('Tạo quiz mới')
  create(@Body() dto: CreateQuizDto, @User() user: IUser) {
    return this.service.create(dto, user);
  }

  // ── Param routes (:id) — đặt SAU static routes ──────────────────────────
  @Get(':id')
  @Public()
  @ResponseMessage('Lấy chi tiết quiz')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ✅ POST /:id/submit — quizId từ URL param, KHÔNG lấy từ body
  @Post(':id/submit')
  @ResponseMessage('Nộp bài và tính điểm')
  submit(
    @Param('id') quizId: string,
    @Body() dto: SubmitAttemptDto,
    @User() user: IUser,
  ) {
    return this.service.submitAttempt({ ...dto, quizId }, user.id);
  }

  @Get(':id/my-attempts')
  @ResponseMessage('Lịch sử làm bài của quiz này')
  myAttempts(@Param('id') quizId: string, @User() user: IUser) {
    return this.service.getMyAttempts(quizId, user.id);
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
