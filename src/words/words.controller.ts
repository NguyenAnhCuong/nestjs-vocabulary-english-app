// src/words/words.controller.ts
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
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto, FilterWordDto } from './dto/update-word.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import { CefrLevel } from '../generated/prisma/enums';
import { WordsService } from './words.service';
import type { IUser } from 'src/common/interfaces';

// ← DTO riêng, không dùng lồng CreateWordDto vì class-validator cần @Type
class BulkCreateWordDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWordDto)
  words: CreateWordDto[];
}

@Controller('words')
export class WordsController {
  constructor(private readonly service: WordsService) {}

  @Post()
  @ResponseMessage('Tạo từ vựng mới')
  create(@Body() dto: CreateWordDto) {
    return this.service.create(dto);
  }

  // ← PHẢI đặt TRƯỚC @Get('due') và @Get(':id') để tránh bị match nhầm route
  @Post('bulk')
  @ResponseMessage('Tạo hàng loạt từ vựng')
  bulkCreate(@Body() dto: BulkCreateWordDto) {
    return this.service.bulkCreate(dto.words);
  }

  @Get()
  @ResponseMessage('Lấy danh sách từ vựng')
  findAll(@Query() filter: FilterWordDto) {
    return this.service.findAll(filter);
  }

  @Get('due')
  @ResponseMessage('Lấy từ cần ôn tập hôm nay')
  getDueWords(@User() user: IUser, @Query('limit') limit: string) {
    return this.service.getDueWordsForUser(user.id, +limit || 20);
  }

  @Get('level/:level')
  @ResponseMessage('Lấy từ theo cấp độ')
  getByLevel(@Param('level') level: CefrLevel) {
    return this.service.getWordsByLevel(level);
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết từ vựng')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật từ vựng')
  update(@Param('id') id: string, @Body() dto: UpdateWordDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Xoá từ vựng')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
