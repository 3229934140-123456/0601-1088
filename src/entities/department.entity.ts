import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';
import { IsString, IsOptional, MaxLength } from 'class-validator';

@Entity('departments')
@Index('idx_name', ['name'], { unique: true })
export class Department extends BaseEntity {
  @Column({ type: 'varchar', length: 100, comment: '部门名称' })
  @ApiProperty({ description: '部门名称', maxLength: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '部门编号' })
  @ApiProperty({ description: '部门编号', maxLength: 50, required: false })
  code?: string;

  @Column({ type: 'text', nullable: true, comment: '部门描述' })
  @ApiProperty({ description: '部门描述', required: false })
  description?: string;

  @Column({ type: 'bigint', nullable: true, comment: '上级部门ID' })
  @ApiProperty({ description: '上级部门ID', required: false })
  parentId?: number;

  @Column({ type: 'int', default: 1, comment: '排序' })
  @ApiProperty({ description: '排序', default: 1 })
  sort: number;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  @ApiProperty({ description: '是否启用', default: true })
  enabled: boolean;

  @OneToMany(() => User, (user) => user.department)
  users: User[];
}

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  parentId?: number;

  @IsOptional()
  sort?: number;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  parentId?: number;

  @IsOptional()
  sort?: number;

  @IsOptional()
  enabled?: boolean;
}
