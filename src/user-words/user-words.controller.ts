// src/user-words/user-words.controller.ts
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
import { UserWordsService } from './user-words.service';
import { CreateUserWordDto } from './dto/create-user-word.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';

@Controller('user-words')
export class UserWordsController {
  constructor(private readonly service: UserWordsService) {}

  @Post()
  @ResponseMessage('Thêm từ cá nhân')
  create(@Body() dto: CreateUserWordDto, @User() user: IUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @ResponseMessage('Lấy danh sách từ cá nhân')
  findAll(
    @User() user: IUser,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('sort') sort: string,
  ) {
    return this.service.findAll(
      user.id,
      +current || 1,
      +pageSize || 10,
      sort || 'newest',
    );
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết từ cá nhân')
  findOne(@Param('id') id: string, @User() user: IUser) {
    return this.service.findOne(id, user.id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật từ cá nhân')
  update(@Param('id') id: string, @Body() dto: any, @User() user: IUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ResponseMessage('Xoá từ cá nhân')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.service.remove(id, user);
  }
}
