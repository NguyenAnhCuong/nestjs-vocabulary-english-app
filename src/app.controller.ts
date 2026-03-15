import {
  Controller,
  Post,
  Request,
  Res,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Public, ResponseMessage } from './decorator/customize';
import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';
import { CreateUserDto } from './users/dto/create-user.dto';
import { LocalAuthGuard } from './auth/local-auth.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
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
  async handleLogin(@Request() req, @Res({ passthrough: true }) res: any) {
    console.log('req.user', req.user);
    return this.authService.login(req.user, res);
  }

  @Post('/profile')
  async getProfile(@Request() req) {
    return req.user;
  }
}
