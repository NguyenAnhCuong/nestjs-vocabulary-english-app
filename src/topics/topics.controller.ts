// src/topics/topics.controller.ts
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
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ResponseMessage } from 'src/decorator/customize';
import { IsArray, IsString } from 'class-validator';

class AssignWordsDto {
  @IsArray()
  @IsString({ each: true })
  wordIds!: string[];
}

@Controller('topics')
export class TopicsController {
  constructor(private readonly service: TopicsService) {}

  @Post()
  @ResponseMessage('Tạo chủ đề mới')
  create(@Body() dto: CreateTopicDto) {
    return this.service.create(dto);
  }

  @Get()
  @ResponseMessage('Lấy danh sách chủ đề')
  findAll(
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('onlyActive') onlyActive: string,
  ) {
    return this.service.findAll(
      +current || 1,
      +pageSize || 10,
      onlyActive === 'true',
    );
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết chủ đề')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật chủ đề')
  update(@Param('id') id: string, @Body() dto: UpdateTopicDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Xoá chủ đề')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/words')
  @ResponseMessage('Gán từ vào chủ đề')
  assignWords(@Param('id') id: string, @Body() body: AssignWordsDto) {
    return this.service.assignWords(id, body.wordIds);
  }

  @Delete(':id/words')
  @ResponseMessage('Xoá từ khỏi chủ đề')
  removeWords(@Param('id') id: string, @Body() body: AssignWordsDto) {
    return this.service.removeWords(id, body.wordIds);
  }
}
