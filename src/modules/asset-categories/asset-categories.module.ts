import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetCategoriesService } from './asset-categories.service';
import { AssetCategoriesController } from './asset-categories.controller';
import { AssetCategory } from '../../entities/asset-category.entity';
import { AuditLogsModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([AssetCategory]), AuditLogsModule],
  controllers: [AssetCategoriesController],
  providers: [AssetCategoriesService],
  exports: [AssetCategoriesService],
})
export class AssetCategoriesModule {}
