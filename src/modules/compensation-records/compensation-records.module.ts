import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompensationRecordsService } from './compensation-records.service';
import { CompensationRecordsController } from './compensation-records.controller';
import { CompensationRecord } from '../../entities/compensation-record.entity';
import { ReturnRecord } from '../../entities/return-record.entity';
import { AuditLogsModule } from '../audit-logs/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompensationRecord, ReturnRecord]),
    AuditLogsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [CompensationRecordsController],
  providers: [CompensationRecordsService],
  exports: [CompensationRecordsService],
})
export class CompensationRecordsModule {}
