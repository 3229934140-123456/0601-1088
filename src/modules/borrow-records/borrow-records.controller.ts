import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BorrowRecordsService } from './borrow-records.service';
import {
  CreateBorrowRecordDto,
  ApproveBorrowDto,
  QueryBorrowRecordDto,
  BatchApproveBorrowDto,
} from '../../entities/borrow-record.entity';
import { Roles, GetCurrentUserId, GetCurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('领用管理')
@ApiBearerAuth()
@Controller('borrow-records')
export class BorrowRecordsController {
  constructor(private readonly borrowRecordsService: BorrowRecordsService) {}

  @Post()
  @ApiOperation({ summary: '提交领用申请' })
  create(
    @Body() createBorrowRecordDto: CreateBorrowRecordDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.borrowRecordsService.create(createBorrowRecordDto, operatorId);
  }

  @Get()
  @ApiOperation({ summary: '获取领用记录列表' })
  findAll(
    @Query() query: QueryBorrowRecordDto,
    @GetCurrentUser() currentUser: any,
  ) {
    return this.borrowRecordsService.findAll(query, currentUser);
  }

  @Get('overdue')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '获取超期领用列表（管理员）' })
  getOverdueRecords() {
    return this.borrowRecordsService.getOverdueRecords();
  }

  @Get('expiring')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '获取即将到期领用列表（管理员）' })
  getExpiringRecords(@Query('days') days: number = 3) {
    return this.borrowRecordsService.getExpiringRecords(days);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取领用记录详情' })
  findOne(@Param('id') id: string) {
    return this.borrowRecordsService.findOne(+id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '审批领用申请（管理员）' })
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveBorrowDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.borrowRecordsService.approve(+id, approveDto, operatorId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '撤销领用申请' })
  cancel(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.borrowRecordsService.cancel(+id, operatorId);
  }

  @Post('batch-approve')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '批量审批领用申请（管理员）' })
  batchApprove(
    @Body() batchDto: BatchApproveBorrowDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.borrowRecordsService.batchApprove(batchDto, operatorId);
  }
}
