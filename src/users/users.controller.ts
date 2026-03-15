import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface IUser {
  id: string;
  email: string;
  name: string;
  createdAt?: Date;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ResponseMessage('Create new user')
  create(@Body() createUserDto: CreateUserDto, @User() user: IUser) {
    return this.usersService.create(createUserDto, user);
  }

  @Get()
  @ResponseMessage('Fetch list Users with paginate')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.usersService.findAll(+currentPage, +limit, qs);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Update user')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: IUser,
  ) {
    return this.usersService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @ResponseMessage('Delete user')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.usersService.remove(id, user);
  }
}
