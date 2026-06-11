import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CabinetCallbackService } from './cabinet-callback.service';
import { CabinetCallbackController } from './cabinet-callback.controller';
import { CabinetCallback } from '../../entities/cabinet-callback.entity';
import { AuditLogsModule } from '../audit-logs/audit-log.module';
import { BorrowRecordsModule } from '../borrow-records/borrow-records.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CabinetCallback]),
    AuditLogsModule,
    forwardRef(() => BorrowRecordsModule),
    AssetsModule,
  ],
  controllers: [CabinetCallbackController],
  providers: [CabinetCallbackService],
  exports: [CabinetCallbackService],
})
export class CabinetCallbackModule {}
