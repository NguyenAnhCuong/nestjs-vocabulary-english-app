// src/user-goals/user-goals.module.ts
import { Module } from '@nestjs/common';
import { UserGoalsService } from './user-goals.service';
import { UserGoalsController } from './user-goals.controller';

@Module({
  controllers: [UserGoalsController],
  providers: [UserGoalsService],
  exports: [UserGoalsService],
})
export class UserGoalsModule {}
