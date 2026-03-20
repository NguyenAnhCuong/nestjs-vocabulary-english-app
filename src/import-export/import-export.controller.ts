// src/import-export/import-export.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ImportExportService } from './import-export.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WordRowDto {
  @IsString()
  en: string;

  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsString()
  meaning: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class ImportDto {
  @IsOptional()
  @IsString()
  fileName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WordRowDto)
  words: WordRowDto[];
}

@Controller('import-export')
export class ImportExportController {
  constructor(private readonly service: ImportExportService) {}

  @Post('import')
  @ResponseMessage('Import từ vựng')
  import(@Body() dto: ImportDto, @User() user: IUser) {
    return this.service.importUserWords(user.id, dto.words, dto.fileName);
  }

  @Get('export')
  @ResponseMessage('Export từ vựng cá nhân')
  export(@User() user: IUser) {
    return this.service.exportUserWords(user.id);
  }

  @Get('history')
  @ResponseMessage('Lịch sử import/export')
  history(
    @User() user: IUser,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.service.getHistory(user.id, +current || 1, +pageSize || 10);
  }
}
