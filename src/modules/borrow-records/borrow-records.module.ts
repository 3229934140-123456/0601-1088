import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowRecordsController } from './borrow-records.controller';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { Asset } from '../../entities/asset.entity';
import { User } from '../../entities/user.entity';
import { AuditLogsModule } from '../audit-logs/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BorrowRecord, Asset, User]),
    AuditLogsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [BorrowRecordsController],
  providers: [BorrowRecordsService],
  exports: [BorrowRecordsService],
})
export class BorrowRecordsModule {}
