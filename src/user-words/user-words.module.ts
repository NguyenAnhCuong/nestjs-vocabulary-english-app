// src/user-words/user-words.module.ts
import { Module } from '@nestjs/common';
import { UserWordsService } from './user-words.service';
import { UserWordsController } from './user-words.controller';

@Module({
  controllers: [UserWordsController],
  providers: [UserWordsService],
  exports: [UserWordsService],
})
export class UserWordsModule {}
