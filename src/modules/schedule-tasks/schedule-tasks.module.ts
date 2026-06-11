import { Module } from '@nestjs/common';
import { ScheduleTasksService } from './schedule-tasks.service';
import { ScheduleTasksController } from './schedule-tasks.controller';
import { BorrowRecordsModule } from '../borrow-records/borrow-records.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [BorrowRecordsModule, NotificationsModule],
  controllers: [ScheduleTasksController],
  providers: [ScheduleTasksService],
  exports: [ScheduleTasksService],
})
export class ScheduleTasksModule {}
