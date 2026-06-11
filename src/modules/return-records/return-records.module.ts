import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnRecordsService } from './return-records.service';
import { ReturnRecordsController } from './return-records.controller';
import { ReturnRecord } from '../../entities/return-record.entity';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { Asset } from '../../entities/asset.entity';
import { AuditLogsModule } from '../audit-logs/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReturnRecord, BorrowRecord, Asset]),
    AuditLogsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ReturnRecordsController],
  providers: [ReturnRecordsService],
  exports: [ReturnRecordsService],
})
export class ReturnRecordsModule {}
