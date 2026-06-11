import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { Asset } from '../../entities/asset.entity';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { ReturnRecord } from '../../entities/return-record.entity';
import { CompensationRecord } from '../../entities/compensation-record.entity';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { AssetCategory } from '../../entities/asset-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      BorrowRecord,
      ReturnRecord,
      CompensationRecord,
      User,
      Department,
      AssetCategory,
    ]),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
