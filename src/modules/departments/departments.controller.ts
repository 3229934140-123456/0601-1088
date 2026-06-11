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
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '../../entities/department.entity';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('部门管理')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '创建部门（管理员）' })
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.departmentsService.create(createDepartmentDto, operatorId);
  }

  @Get()
  @ApiOperation({ summary: '获取部门列表' })
  findAll(@Query() query: { enabled?: boolean; parentId?: number }) {
    return this.departmentsService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取部门树结构' })
  findTree() {
    return this.departmentsService.findTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取部门详情' })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '更新部门（管理员）' })
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.departmentsService.update(+id, updateDepartmentDto, operatorId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '删除部门（超级管理员）' })
  remove(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.departmentsService.remove(+id, operatorId);
  }
}
