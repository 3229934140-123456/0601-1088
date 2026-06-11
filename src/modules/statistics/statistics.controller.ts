import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('统计查询')
@ApiBearerAuth()
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '获取概览统计' })
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('asset-status')
  @ApiOperation({ summary: '获取资产状态统计' })
  getAssetStatusStats() {
    return this.statisticsService.getAssetStatusStats();
  }

  @Get('asset-by-category')
  @ApiOperation({ summary: '按类别统计资产' })
  getAssetByCategory() {
    return this.statisticsService.getAssetByCategory();
  }

  @Get('borrow-trend')
  @ApiOperation({ summary: '获取领用归还趋势' })
  getBorrowTrend(@Query('days') days: number = 30) {
    return this.statisticsService.getBorrowTrend(days);
  }

  @Get('department-usage')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '部门使用汇总（管理员）' })
  getDepartmentUsage(
    @Query()
    params: {
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.statisticsService.getDepartmentUsage(params);
  }

  @Get('my-usage')
  @ApiOperation({ summary: '获取我的使用统计' })
  getMyUsage(@GetCurrentUserId() userId: number) {
    return this.statisticsService.getUserUsage(userId);
  }

  @Get('user-usage/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '获取用户使用统计（管理员）' })
  getUserUsage(@Param('userId') userId: string) {
    return this.statisticsService.getUserUsage(+userId);
  }

  @Get('asset-history/:assetId')
  @ApiOperation({ summary: '获取资产使用历史' })
  getAssetUsageHistory(@Param('assetId') assetId: string) {
    return this.statisticsService.getAssetUsageHistory(+assetId);
  }

  @Get('overdue-ranking')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '超期排行榜（管理员）' })
  getOverdueRanking(@Query('limit') limit: number = 10) {
    return this.statisticsService.getOverdueRanking(limit);
  }
}
