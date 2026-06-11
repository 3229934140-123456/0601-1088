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
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
} from '../../entities/location.entity';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('位置管理')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '创建位置（管理员）' })
  create(
    @Body() createLocationDto: CreateLocationDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.locationsService.create(createLocationDto, operatorId);
  }

  @Get()
  @ApiOperation({ summary: '获取位置列表' })
  findAll(@Query() query: { enabled?: boolean; parentId?: number }) {
    return this.locationsService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取位置树结构' })
  findTree() {
    return this.locationsService.findTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取位置详情' })
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '更新位置（管理员）' })
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.locationsService.update(+id, updateLocationDto, operatorId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '删除位置（超级管理员）' })
  remove(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.locationsService.remove(+id, operatorId);
  }
}
