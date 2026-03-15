import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { TransformInterceptor } from './interceptor/transform.interceptor';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const reflector = app.get('Reflector');
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.use(cookieParser());

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 8888;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
