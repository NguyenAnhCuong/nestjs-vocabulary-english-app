// src/quizzes/dto/create-quiz.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  Max,
  IsNotEmpty,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { CefrLevel } from '../../generated/prisma/enums';

// ── Pronunciation question (5 câu) ─────────────────────────────────────────
export class CreatePronunciationQuestionDto {
  @IsInt() @Min(1) order: number;
  @IsString() @IsNotEmpty() question: string;
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];
  @IsString() @IsNotEmpty() answer: string;
  @IsString() @IsNotEmpty() explanation: string;
  @IsArray() @IsString({ each: true }) @IsOptional() phonetics?: string[];
}

// ── Vocabulary question (1–15 câu) ─────────────────────────────────────────
export class CreateVocabularyQuestionDto {
  @IsInt() @Min(1) order: number;
  @IsString() @IsNotEmpty() question: string;
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];
  @IsString() @IsNotEmpty() answer: string;
  @IsString() @IsNotEmpty() explanation: string;
}

// ── Reading blank ───────────────────────────────────────────────────────────
export class CreateReadingBlankDto {
  @IsString() @IsNotEmpty() label: string; // "BLANK1", "BLANK2"...
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];
  @IsString() @IsNotEmpty() answer: string;
}

export class CreateReadingQuestionDto {
  @IsInt() @Min(1) order: number;
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() passage: string; // văn bản có [BLANK1], [BLANK2]...
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReadingBlankDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  blanks: CreateReadingBlankDto[];
}

// ── Create Quiz ─────────────────────────────────────────────────────────────
export class CreateQuizDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(CefrLevel) level: CefrLevel;
  @IsInt() @Min(10) @Max(120) @IsOptional() durationMinutes?: number;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
  @IsBoolean() @IsOptional() isPublished?: boolean;

  /** Đúng 5 câu phát âm */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePronunciationQuestionDto)
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  pronunciationQuestions: CreatePronunciationQuestionDto[];

  /** 1–15 câu từ vựng */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVocabularyQuestionDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  vocabularyQuestions: CreateVocabularyQuestionDto[];

  /** 1 bài đọc hiểu */
  @ValidateNested()
  @Type(() => CreateReadingQuestionDto)
  readingQuestion: CreateReadingQuestionDto;
}

export class UpdateQuizDto extends PartialType(CreateQuizDto) {}

// ── Submit attempt ──────────────────────────────────────────────────────────
export class SubmitAttemptDto {
  @IsString() @IsNotEmpty() quizId: string;
  /** Map: questionId | blankId → answer chọn */
  answers: Record<string, string>;
  @IsInt() @Min(0) timeTakenSeconds: number;
}

// ── Filter ──────────────────────────────────────────────────────────────────
export class FilterQuizDto {
  @IsOptional() @IsInt() @Min(1) current?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50) pageSize?: number;
  @IsOptional() @IsEnum(CefrLevel) level?: CefrLevel;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
