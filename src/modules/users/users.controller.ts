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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from '../../entities/user.entity';
import { Roles, GetCurrentUserId } from '../../common/decorators';
import { UserRole } from '../../common/enums';

@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '创建用户（管理员）' })
  create(@Body() createUserDto: CreateUserDto, @GetCurrentUserId() operatorId: number) {
    return this.usersService.create(createUserDto, operatorId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '获取用户列表（管理员）' })
  findAll(
    @Query()
    query: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      departmentId?: number;
      role?: UserRole;
      enabled?: boolean;
    },
  ) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '更新用户（管理员）' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetCurrentUserId() operatorId: number,
  ) {
    return this.usersService.update(+id, updateUserDto, operatorId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '删除用户（超级管理员）' })
  remove(@Param('id') id: string, @GetCurrentUserId() operatorId: number) {
    return this.usersService.remove(+id, operatorId);
  }

  @Get('employee/:employeeId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '根据员工编号查询（管理员）' })
  findByEmployeeId(@Param('employeeId') employeeId: string) {
    return this.usersService.findByEmployeeId(employeeId);
  }
}
