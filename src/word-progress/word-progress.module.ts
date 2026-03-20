// src/word-progress/word-progress.module.ts
import { Module } from '@nestjs/common';
import { WordProgressService } from './word-progress.service';
import { WordProgressController } from './word-progress.controller';

@Module({
  controllers: [WordProgressController],
  providers: [WordProgressService],
  exports: [WordProgressService],
})
export class WordProgressModule {}
