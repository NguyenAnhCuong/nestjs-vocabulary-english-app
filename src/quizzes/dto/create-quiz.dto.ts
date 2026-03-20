// src/quizzes/dto/create-quiz.dto.ts
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsOptional,
  IsString, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CefrLevel } from '@prisma/client';

export class CreateQuizQuestionDto {
  @IsOptional()
  @IsString()
  wordId?: string;

  @IsString()
  questionText: string;

  @IsOptional()
  @IsString()
  questionType?: string; // 'multiple_choice' | 'fill_blank' | 'listening' | 'matching'

  @IsOptional()
  options?: any; // JSON: [{ id, text, isCorrect }]

  @IsString()
  answer: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CefrLevel)
  level?: CefrLevel;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions?: CreateQuizQuestionDto[];
}
