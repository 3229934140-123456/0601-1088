import { Controller, Post, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CabinetCallbackService } from './cabinet-callback.service';
import {
  CabinetCallbackDto,
  CabinetCallbackRetryDto,
} from '../../entities/cabinet-callback.entity';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('门禁柜回调')
@ApiBearerAuth()
@Controller('cabinet-callback')
export class CabinetCallbackController {
  constructor(private readonly cabinetCallbackService: CabinetCallbackService) {}

  @Post()
  @ApiOperation({ summary: '门禁柜回调（领取/归还）- 支持重复回调、失败重试' })
  handleCallback(@Body() dto: CabinetCallbackDto) {
    return this.cabinetCallbackService.handleCallback(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '查询回调记录（管理员）' })
  findAll(
    @Query() params: {
      page?: number;
      pageSize?: number;
      cabinetCode?: string;
      lockerNumber?: string;
      action?: string;
      status?: string;
      borrowRecordId?: string;
    },
  ) {
    return this.cabinetCallbackService.findAll({
      ...params,
      borrowRecordId: params.borrowRecordId ? +params.borrowRecordId : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '获取回调记录详情（管理员）' })
  findOne(@Param('id') id: string) {
    return this.cabinetCallbackService.findOne(+id);
  }

  @Patch(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '重试单个回调（管理员）' })
  retry(@Param('id') id: string) {
    return this.cabinetCallbackService.retry(+id);
  }

  @Post('batch-retry')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '批量重试回调（管理员）' })
  batchRetry(@Body() dto: CabinetCallbackRetryDto) {
    return this.cabinetCallbackService.batchRetry(dto.ids);
  }
}
