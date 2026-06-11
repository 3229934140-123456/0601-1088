import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { Asset } from '../../entities/asset.entity';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { AuditLogsModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, BorrowRecord]), AuditLogsModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
