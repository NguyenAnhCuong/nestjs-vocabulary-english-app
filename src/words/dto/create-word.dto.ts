// src/words/dto/create-word.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CefrLevel, WordType } from '../../generated/prisma/enums';

export class CreateWordDto {
  @IsString()
  @MaxLength(200)
  en!: string;

  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsEnum(WordType)
  type!: WordType;

  @IsEnum(CefrLevel)
  level!: CefrLevel;

  @IsString()
  meaning!: string;

  @IsOptional()
  @IsString()
  meaningEn?: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsString()
  exampleVi?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // IDs của Topic muốn gán khi tạo từ
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicIds?: string[];
}
