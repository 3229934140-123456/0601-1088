import { Entity, Column, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { BaseEntity } from '../common/entities/base.entity';
import { Department } from './department.entity';
import { BorrowRecord } from './borrow-record.entity';
import { ReturnRecord } from './return-record.entity';
import { CompensationRecord } from './compensation-record.entity';
import { Notification } from './notification.entity';
import { UserRole } from '../common/enums';
import { IsString, IsEmail, IsOptional, MaxLength, IsEnum } from 'class-validator';

@Entity('users')
@Index('idx_employee_id', ['employeeId'], { unique: true })
@Index('idx_username', ['username'], { unique: true })
@Index('idx_department_id', ['departmentId'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, comment: '员工编号' })
  @ApiProperty({ description: '员工编号', maxLength: 50 })
  employeeId: string;

  @Column({ type: 'varchar', length: 50, unique: true, comment: '用户名' })
  @ApiProperty({ description: '用户名', maxLength: 50 })
  username: string;

  @Column({ type: 'varchar', length: 255, comment: '密码哈希' })
  password: string;

  @Column({ type: 'varchar', length: 50, comment: '姓名' })
  @ApiProperty({ description: '姓名', maxLength: 50 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '手机号' })
  @ApiProperty({ description: '手机号', maxLength: 20, required: false })
  phone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '邮箱' })
  @ApiProperty({ description: '邮箱', maxLength: 100, required: false })
  email?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    comment: '角色',
  })
  @ApiProperty({ description: '角色', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'bigint', nullable: true, comment: '部门ID' })
  @ApiProperty({ description: '部门ID', required: false })
  departmentId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '头像URL' })
  @ApiProperty({ description: '头像URL', required: false })
  avatar?: string;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  @ApiProperty({ description: '是否启用', default: true })
  enabled: boolean;

  @ManyToOne(() => Department, (department) => department.users)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @OneToMany(() => BorrowRecord, (record) => record.borrower)
  borrowRecords: BorrowRecord[];

  @OneToMany(() => ReturnRecord, (record) => record.confirmer)
  confirmedReturns: ReturnRecord[];

  @OneToMany(() => CompensationRecord, (record) => record.handler)
  handledCompensations: CompensationRecord[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  async hashPassword(password: string): Promise<void> {
    this.password = await bcrypt.hash(password, 10);
  }
}

export class CreateUserDto {
  @IsString()
  @MaxLength(50)
  employeeId: string;

  @IsString()
  @MaxLength(50)
  username: string;

  @IsString()
  @MaxLength(50)
  password: string;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  departmentId?: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  departmentId?: number;

  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  password?: string;
}
