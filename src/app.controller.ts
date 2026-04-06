import {
  Controller,
  Post,
  Request,
  Res,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public, ResponseMessage } from './decorator/customize';
import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';
import { CreateUserDto } from './users/dto/create-user.dto';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post('/register')
  @ResponseMessage('Register new user')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto, {
      id: 'system',
      email: 'system',
    });
  }

  @Public()
  @Post('/login')
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('User login')
  async handleLogin(@Request() req: any, @Res({ passthrough: true }) res: any) {
    return this.authService.login(req.user, res);
  }

  @Post('/profile')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Public()
  @Post('/refresh')
  @ResponseMessage('Refresh token success')
  async handleRefresh(
    @Body('refresh_token') refreshToken: string,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!refreshToken) throw new BadRequestException('Thiếu refresh token');
    return this.authService.handleRefreshToken(refreshToken, res);
  }

  // src/app.controller.ts
  @Public()
  @Post('/google-login')
  @ResponseMessage('Login with Google success')
  async googleLogin(
    @Body('token') token: string,
    @Res({ passthrough: true }) res: any,
  ) {
    if (!token) throw new BadRequestException('Missing token');

    // Dùng ConfigService thay vì process.env
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const client = new OAuth2Client(clientId);

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new BadRequestException('Google token invalid');
      }

      const googleUser = {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        googleId: payload.sub,
        avatarUrl: payload.picture,
      };

      const user = await this.usersService.upsertGoogleUser(googleUser);

      // Trả về login để set Cookie Refresh Token và Access Token
      return this.authService.login(user as any, res);
    } catch (error) {
      throw new BadRequestException('Xác thực Google thất bại!');
    }
  }
}
