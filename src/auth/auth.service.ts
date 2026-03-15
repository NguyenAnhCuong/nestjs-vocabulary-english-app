import { Injectable } from '@nestjs/common';
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
      user: {
        id,
        name,
        email,
      },
    };
  }
}
