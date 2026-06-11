import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { BorrowRecordsService } from '../borrow-records/borrow-records.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, BorrowStatus } from '../../common/enums';

@Injectable()
export class ScheduleTasksService {
  private readonly logger = new Logger(ScheduleTasksService.name);

  constructor(
    private configService: ConfigService,
    private borrowRecordsService: BorrowRecordsService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM, {
    name: 'overdue-check',
    timeZone: 'Asia/Shanghai',
  })
  async handleOverdueCheck() {
    this.logger.log('开始执行超期检测任务...');

    try {
      const overdueRecords = await this.borrowRecordsService.getOverdueRecords();
      this.logger.log(`发现 ${overdueRecords.length} 条超期记录`);

      for (const record of overdueRecords) {
        if (record.status === BorrowStatus.BORROWED) {
          await this.borrowRecordsService.markAsOverdue(record.id);
        }

        await this.notificationsService.create({
          userId: record.borrowerId,
          type: NotificationType.OVERDUE_WARNING,
          title: '资产超期提醒',
          content: `您领用的 ${record.asset?.name} 已超期，请尽快归还。超期天数：${Math.abs(record.daysRemaining)} 天`,
          relatedData: {
            borrowRecordId: record.id,
            assetId: record.assetId,
            overdueDays: Math.abs(record.daysRemaining),
          },
        });
      }

      this.logger.log('超期检测任务执行完成');
    } catch (error) {
      this.logger.error('超期检测任务执行失败', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'expire-notification',
    timeZone: 'Asia/Shanghai',
  })
  async handleExpireNotification() {
    this.logger.log('开始执行到期通知任务...');

    try {
      const notifyDays = this.configService.get<number>('EXPIRE_NOTIFY_DAYS', 3);
      const expiringRecords = await this.borrowRecordsService.getExpiringRecords(notifyDays);
      this.logger.log(`发现 ${expiringRecords.length} 条即将到期记录`);

      for (const record of expiringRecords) {
        const daysRemaining = record.daysRemaining;
        if (daysRemaining > 0) {
          await this.notificationsService.create({
            userId: record.borrowerId,
            type: NotificationType.RETURN_REMINDER,
            title: '资产到期提醒',
            content: `您领用的 ${record.asset?.name} 将在 ${daysRemaining} 天后到期，请按时归还`,
            relatedData: {
              borrowRecordId: record.id,
              assetId: record.assetId,
              daysRemaining,
            },
          });
        }
      }

      this.logger.log('到期通知任务执行完成');
    } catch (error) {
      this.logger.error('到期通知任务执行失败', error);
    }
  }

  async triggerOverdueCheck() {
    this.logger.log('手动触发超期检测...');
    await this.handleOverdueCheck();
    return { message: '超期检测已执行' };
  }

  async triggerExpireNotification() {
    this.logger.log('手动触达到期通知...');
    await this.handleExpireNotification();
    return { message: '到期通知已执行' };
  }
}
