// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './passport/jwt.strategy';
import { LocalStrategy } from './passport/local.strategy';
import { StringValue } from 'ms'; // Import StringValue từ thư viện ms

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Ép kiểu để TypeScript hiểu đây là định dạng thời gian hợp lệ
        const expiresIn = configService.get<string>(
          'JWT_EXPIRES_IN',
        ) as StringValue;

        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn || '1h',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
