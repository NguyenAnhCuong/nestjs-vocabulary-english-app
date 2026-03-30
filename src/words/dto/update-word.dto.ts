// src/words/dto/update-word.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateWordDto } from './create-word.dto';
export class UpdateWordDto extends PartialType(CreateWordDto) {}

// src/words/dto/filter-word.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CefrLevel, WordType } from '../../generated/prisma/enums';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class FilterWordDto extends PaginationDto {
  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @IsOptional()
  @IsEnum(WordType)
  type?: WordType;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
