import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduleTasksService } from './schedule-tasks.service';
import { Roles } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('定时任务')
@ApiBearerAuth()
@Controller('schedule-tasks')
export class ScheduleTasksController {
  constructor(private readonly scheduleTasksService: ScheduleTasksService) {}

  @Post('trigger-overdue-check')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '手动触发超期检测（管理员）' })
  triggerOverdueCheck() {
    return this.scheduleTasksService.triggerOverdueCheck();
  }

  @Post('trigger-expire-notification')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '手动触达到期通知（管理员）' })
  triggerExpireNotification() {
    return this.scheduleTasksService.triggerExpireNotification();
  }
}
