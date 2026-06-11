import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from '../../entities/notification.entity';
import { GetCurrentUserId } from '../../common/decorators';

@ApiTags('通知管理')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '获取我的通知列表' })
  findByUser(
    @GetCurrentUserId() userId: number,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationsService.findByUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  getUnreadCount(@GetCurrentUserId() userId: number) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  markAllAsRead(@GetCurrentUserId() userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取通知详情' })
  findOne(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.notificationsService.findOne(+id, userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记通知已读' })
  markAsRead(@Param('id') id: string, @GetCurrentUserId() userId: number) {
    return this.notificationsService.markAsRead(+id, userId);
  }
}
