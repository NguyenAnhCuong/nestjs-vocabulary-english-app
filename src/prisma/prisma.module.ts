import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Để có thể dùng PrismaService ở mọi nơi mà không cần import lại
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
