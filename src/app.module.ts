import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { AssetCategoriesModule } from './modules/asset-categories/asset-categories.module';
import { LocationsModule } from './modules/locations/locations.module';
import { AssetsModule } from './modules/assets/assets.module';
import { BorrowRecordsModule } from './modules/borrow-records/borrow-records.module';
import { ReturnRecordsModule } from './modules/return-records/return-records.module';
import { CompensationRecordsModule } from './modules/compensation-records/compensation-records.module';
import { AuditLogsModule } from './modules/audit-logs/audit-log.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ScheduleTasksModule } from './modules/schedule-tasks/schedule-tasks.module';
import { UploadModule } from './modules/upload/upload.module';
import { CabinetCallbackModule } from './modules/cabinet-callback/cabinet-callback.module';
import { DataSourceConfig } from './data-source';
import { JwtAuthGuard, RolesGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(DataSourceConfig),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    AssetCategoriesModule,
    LocationsModule,
    AssetsModule,
    BorrowRecordsModule,
    ReturnRecordsModule,
    CompensationRecordsModule,
    AuditLogsModule,
    StatisticsModule,
    NotificationsModule,
    ScheduleTasksModule,
    UploadModule,
    CabinetCallbackModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
