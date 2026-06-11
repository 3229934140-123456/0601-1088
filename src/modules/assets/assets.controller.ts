import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  QueryAssetDto,
} from '../../entities/asset.entity';
import { Roles, GetCurrentUserId, GetCurrentUser } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('资产管理')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '创建资产（管理员）' })
  create(
    @Body() createAssetDto: CreateAssetDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.assetsService.create(createAssetDto, operatorId);
  }

  @Get()
  @ApiOperation({ summary: '获取资产列表' })
  findAll(@Query() query: QueryAssetDto) {
    return this.assetsService.findAll(query);
  }

  @Get('available')
  @ApiOperation({ summary: '获取可领用资产列表' })
  findAvailable(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      categoryId?: number;
      locationId?: number;
    },
  ) {
    return this.assetsService.findAvailable(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取资产统计数据' })
  getStats() {
    return this.assetsService.getStats();
  }

  @Get('my-borrowed')
  @ApiOperation({ summary: '获取我的借用资产' })
  findBorrowedByUser(@GetCurrentUserId() userId: number) {
    return this.assetsService.findBorrowedByUser(userId);
  }

  @Get('code/:assetCode')
  @ApiOperation({ summary: '根据资产编号查询' })
  findByAssetCode(@Param('assetCode') assetCode: string) {
    return this.assetsService.findByAssetCode(assetCode);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取资产详情' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '更新资产（管理员）' })
  update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.assetsService.update(+id, updateAssetDto, operatorId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '删除资产（超级管理员）' })
  remove(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.assetsService.remove(+id, operatorId);
  }

  @Put(':id/freeze')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '冻结资产（管理员）' })
  freeze(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.assetsService.freeze(+id, operatorId);
  }

  @Put(':id/unfreeze')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '解冻资产（管理员）' })
  unfreeze(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.assetsService.unfreeze(+id, operatorId);
  }
}
