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
import { ReturnRecordsService } from './return-records.service';
import {
  CreateReturnRecordDto,
  ConfirmReturnDto,
} from '../../entities/return-record.entity';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole, ReturnStatus } from '../../common/enums';

@ApiTags('归还管理')
@ApiBearerAuth()
@Controller('return-records')
export class ReturnRecordsController {
  constructor(private readonly returnRecordsService: ReturnRecordsService) {}

  @Post()
  @ApiOperation({ summary: '提交归还申请' })
  create(
    @Body() createReturnRecordDto: CreateReturnRecordDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.returnRecordsService.create(createReturnRecordDto, operatorId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '获取归还记录列表（管理员）' })
  findAll(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      status?: ReturnStatus;
      startDate?: Date;
      endDate?: Date;
      hasDamage?: boolean;
    },
  ) {
    return this.returnRecordsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取归还记录详情' })
  findOne(@Param('id') id: string) {
    return this.returnRecordsService.findOne(+id);
  }

  @Get('borrow-record/:borrowRecordId')
  @ApiOperation({ summary: '根据领用记录查询归还信息' })
  findByBorrowRecordId(@Param('borrowRecordId') borrowRecordId: string) {
    return this.returnRecordsService.findByBorrowRecordId(+borrowRecordId);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '确认归还（管理员）' })
  confirm(
    @Param('id') id: string,
    @Body() confirmDto: ConfirmReturnDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.returnRecordsService.confirm(+id, confirmDto, operatorId);
  }
}
