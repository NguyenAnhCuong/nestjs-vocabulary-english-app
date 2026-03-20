// src/notifications/notifications.controller.ts
import { Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import type { IUser } from 'src/common/interfaces';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ResponseMessage('Lấy danh sách thông báo')
  findAll(
    @User() user: IUser,
    @Query('current') current: string,
    @Query('pageSize') pageSize: string,
    @Query('onlyUnread') onlyUnread: string,
  ) {
    return this.service.findAll(
      user.id,
      +current || 1,
      +pageSize || 20,
      onlyUnread === 'true',
    );
  }

  @Patch(':id/read')
  @ResponseMessage('Đánh dấu đã đọc')
  markRead(@Param('id') id: string, @User() user: IUser) {
    return this.service.markRead(id, user.id);
  }

  @Patch('read-all')
  @ResponseMessage('Đánh dấu tất cả đã đọc')
  markAllRead(@User() user: IUser) {
    return this.service.markAllRead(user.id);
  }

  @Delete(':id')
  @ResponseMessage('Xoá thông báo')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.service.deleteOne(id, user.id);
  }
}
