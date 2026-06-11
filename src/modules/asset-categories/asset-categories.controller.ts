import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssetCategoriesService } from './asset-categories.service';
import {
  CreateAssetCategoryDto,
  UpdateAssetCategoryDto,
} from '../../entities/asset-category.entity';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('资产类别')
@ApiBearerAuth()
@Controller('asset-categories')
export class AssetCategoriesController {
  constructor(private readonly categoriesService: AssetCategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '创建资产类别（管理员）' })
  create(
    @Body() createCategoryDto: CreateAssetCategoryDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.categoriesService.create(createCategoryDto, operatorId);
  }

  @Get()
  @ApiOperation({ summary: '获取资产类别列表' })
  findAll(@Query() query: { enabled?: boolean; parentId?: number }) {
    return this.categoriesService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取资产类别树结构' })
  findTree() {
    return this.categoriesService.findTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取资产类别详情' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '更新资产类别（管理员）' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateAssetCategoryDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto, operatorId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '删除资产类别（超级管理员）' })
  remove(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.categoriesService.remove(+id, operatorId);
  }
}
