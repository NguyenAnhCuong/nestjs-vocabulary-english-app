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
import { ImportExportModule } from './import-export/import-export.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { UserGoalsModule } from './user-goals/user-goals.module';
import { StudySessionsModule } from './study-sessions/study-sessions.module';
import { UserWordsModule } from './user-words/user-words.module';
import { FavouritesModule } from './favourites/favourites.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    WordsModule,
    LearningConfigModule,
    TopicsModule,
    WordProgressModule,
    ImportExportModule,
    NotificationsModule,
    FavouritesModule,
    QuizzesModule,
    UserGoalsModule,
    StudySessionsModule,
    UserWordsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
