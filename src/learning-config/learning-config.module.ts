// src/learning-config/learning-config.module.ts
import { Module } from '@nestjs/common';
import { LearningConfigService } from './learning-config.service';
import { LearningConfigController } from './learning-config.controller';

@Module({
  controllers: [LearningConfigController],
  providers: [LearningConfigService],
  exports: [LearningConfigService],
})
export class LearningConfigModule {}
