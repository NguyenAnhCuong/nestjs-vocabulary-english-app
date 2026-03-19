import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { IUser } from 'src/users/users.controller';
import ms, { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsername(username);
    if (user) {
      const isValid = this.usersService.checkUserPassword(user.password, pass);
      if (isValid) {
        return user;
      }
    }
    return null;
  }

  // auth.service.ts
  createRefreshToken = (payload: any) => {
    const refreshExpire = this.configService.get<string>(
      'JWT_REFRESH_EXPIRE',
    ) as StringValue;

    const refreshToken = this.jwtService.sign(payload, {
      // Đảm bảo Key trong .env khớp: JWT_REFRESH_SECRET hay JWT_REFRESH_TOKEN_SECRET?
      // Theo .env của bạn là JWT_REFRESH_SECRET
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpire,
    });

    return refreshToken;
  };

  // src/auth/auth.service.ts
  async handleRefreshToken(refreshToken: string, res: Response) {
    try {
      // 1. Kiểm tra token có hợp lệ không (sai secret, hết hạn...)
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 2. Tìm user trong DB bằng ID từ payload
      const user = await this.usersService.findOne(payload.id);

      // 3. So khớp refresh_token gửi lên với cái lưu trong DB
      if (user && user.refreshToken === refreshToken) {
        // 4. Nếu khớp, tiến hành login lại để lấy bộ token mới (AT & RT mới)
        return this.login(user as any, res);
      } else {
        throw new BadRequestException(
          'Refresh token không hợp lệ hoặc đã bị sử dụng',
        );
      }
    } catch (error) {
      throw new BadRequestException(
        'Refresh token đã hết hạn hoặc không hợp lệ',
      );
    }
  }

  async register(createUserDto: any, createdBy: any) {
    return this.usersService.create(createUserDto, createdBy);
  }

  async login(user: IUser, res: Response) {
    const { id, name, email } = user;
    const payload = {
      sub: 'token login',
      iss: 'from server',
      id,
      name,
      email,
    };

    const refreshToken = this.createRefreshToken(payload);

    //update user with refreshToken
    await this.usersService.updateUserToken(refreshToken, id);

    const refreshTokenExpire =
      this.configService.get<string>('JWT_REFRESH_EXPIRE');

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Khuyên dùng cho môi trường thật
      sameSite: 'lax',
      // Ép kiểu sang StringValue để thư viện ms nhận diện được
      maxAge: ms(refreshTokenExpire as StringValue),
    });

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user: {
        id,
        name,
        email,
      },
    };
  }
}
