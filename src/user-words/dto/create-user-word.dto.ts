// src/user-words/dto/create-user-word.dto.ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CefrLevel, WordType } from '../../generated/prisma/enums';

export class CreateUserWordDto {
  @IsString()
  @MaxLength(200)
  en: string;

  @IsOptional()
  @IsString()
  phonetic?: string;

  @IsOptional()
  @IsEnum(WordType)
  type?: WordType;

  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @IsString()
  meaning: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}
