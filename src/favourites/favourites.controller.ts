// src/favourites/favourites.controller.ts
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { FavouritesService, ToggleFavDto } from './favourites.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';

@Controller('favourites')
export class FavouritesController {
  constructor(private readonly service: FavouritesService) {}

  @Post('toggle')
  @ResponseMessage('Toggle yêu thích')
  toggle(@Body() dto: ToggleFavDto, @User() user: IUser) {
    return this.service.toggle(dto, user.id);
  }

  @Get()
  @ResponseMessage('Lấy danh sách từ yêu thích')
  findAll(
    @User() user: IUser,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.service.findAll(user.id, +current || 1, +pageSize || 20);
  }

  @Get('check')
  @ResponseMessage('Kiểm tra trạng thái yêu thích')
  check(
    @User() user: IUser,
    @Query('wordId') wordId: string,
    @Query('userWordId') userWordId: string,
  ) {
    return this.service.checkIsFavourite(user.id, wordId, userWordId);
  }
}
