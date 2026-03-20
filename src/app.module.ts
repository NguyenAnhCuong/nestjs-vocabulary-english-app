import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { WordsModule } from './words/words.module';
import { LearningConfigModule } from './learning-config/learning-config.module';
import { TopicsModule } from './topics/topics.module';
import { WordProgressModule } from './word-progress/word-progress.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    WordsModule,
    LearningConfigModule,
    TopicsModule,
    WordProgressModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
