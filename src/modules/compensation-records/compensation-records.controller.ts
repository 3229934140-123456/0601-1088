import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompensationRecordsService } from './compensation-records.service';
import {
  CreateCompensationRecordDto,
  UpdateCompensationRecordDto,
  QueryCompensationRecordDto,
} from '../../entities/compensation-record.entity';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('赔偿记录')
@ApiBearerAuth()
@Controller('compensation-records')
export class CompensationRecordsController {
  constructor(
    private readonly compensationRecordsService: CompensationRecordsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '发起赔偿（管理员）' })
  create(
    @Body() createCompensationRecordDto: CreateCompensationRecordDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.compensationRecordsService.create(createCompensationRecordDto, operatorId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '查询赔偿记录列表（管理员）' })
  findAll(@Query() query: QueryCompensationRecordDto) {
    return this.compensationRecordsService.findAll(query);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '赔偿对账统计（按员工/部门/资产/状态）' })
  getStatistics(@Query() query: QueryCompensationRecordDto) {
    return this.compensationRecordsService.getStatistics(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取赔偿记录详情' })
  findOne(@Param('id') id: string) {
    return this.compensationRecordsService.findOne(+id);
  }

  @Get('return-record/:returnRecordId')
  @ApiOperation({ summary: '根据归还记录查询赔偿信息' })
  findByReturnRecordId(@Param('returnRecordId') returnRecordId: string) {
    return this.compensationRecordsService.findByReturnRecordId(+returnRecordId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '更新赔偿记录（管理员）' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCompensationRecordDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.compensationRecordsService.update(+id, updateDto, operatorId);
  }

  @Put(':id/waive')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '免除赔偿（管理员）' })
  waive(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.compensationRecordsService.waive(+id, operatorId);
  }
}
