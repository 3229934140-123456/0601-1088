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

  @Get('unprocessed-count')
  @ApiOperation({ summary: '获取未处理待办数量（超期+赔偿）' })
  getUnprocessedCount(@GetCurrentUserId() userId: number) {
    return this.notificationsService.getUnprocessedCount(userId);
  }

  @Get('unprocessed')
  @ApiOperation({ summary: '只看未处理事项（超期+赔偿，自动过滤已解决）' })
  findUnprocessed(
    @GetCurrentUserId() userId: number,
    @Query() query: { page?: number; pageSize?: number },
  ) {
    return this.notificationsService.findUnprocessed(userId, query);
  }

  @Get('timeline/borrow-record/:borrowRecordId')
  @ApiOperation({ summary: '按领用单查看完整时间线（申请/审批/领取/超期/归还/赔偿）' })
  getTimelineByBorrowRecord(
    @GetCurrentUserId() userId: number,
    @Param('borrowRecordId') borrowRecordId: string,
  ) {
    return this.notificationsService.getTimelineByBorrowRecord(userId, +borrowRecordId);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: '按业务单聚合查看提醒历史' })
  findByEntity(
    @GetCurrentUserId() userId: number,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.notificationsService.findByEntity(userId, entityType, +entityId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  markAllAsRead(@GetCurrentUserId() userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch('batch-read')
  @ApiOperation({ summary: '批量标记已读' })
  batchMarkAsRead(
    @GetCurrentUserId() userId: number,
    @Body() body: { ids: number[] },
  ) {
    return this.notificationsService.batchMarkAsRead(userId, body.ids);
  }

  @Patch('entity-read/:entityType/:entityId')
  @ApiOperation({ summary: '按业务单标记所有通知已读' })
  markEntityRead(
    @GetCurrentUserId() userId: number,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.notificationsService.markEntityRead(userId, entityType, +entityId);
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
