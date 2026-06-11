import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CabinetCallbackService } from './cabinet-callback.service';
import { CabinetCallbackController } from './cabinet-callback.controller';
import { CabinetCallback } from '../../entities/cabinet-callback.entity';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { Asset } from '../../entities/asset.entity';
import { AuditLogsModule } from '../audit-logs/audit-log.module';
import { BorrowRecordsModule } from '../borrow-records/borrow-records.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CabinetCallback, BorrowRecord, Asset]),
    AuditLogsModule,
    forwardRef(() => BorrowRecordsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [CabinetCallbackController],
  providers: [CabinetCallbackService],
  exports: [CabinetCallbackService],
})
export class CabinetCallbackModule {}
