import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { AuditAction } from '../common/enums';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

@Entity('audit_logs')
@Index('idx_action', ['action'])
@Index('idx_user_id', ['userId'])
@Index('idx_entity_type', ['entityType'])
@Index('idx_entity_id', ['entityId'])
@Index('idx_created_at', ['createdAt'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'bigint', nullable: true, comment: '操作用户ID' })
  @ApiProperty({ description: '操作用户ID', required: false })
  userId?: number;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '操作用户名' })
  @ApiProperty({ description: '操作用户名', maxLength: 50, required: false })
  username?: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
    comment: '操作类型',
  })
  @ApiProperty({ description: '操作类型', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100, comment: '操作描述' })
  @ApiProperty({ description: '操作描述', maxLength: 100 })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '实体类型' })
  @ApiProperty({ description: '实体类型', maxLength: 50, required: false })
  entityType?: string;

  @Column({ type: 'bigint', nullable: true, comment: '实体ID' })
  @ApiProperty({ description: '实体ID', required: false })
  entityId?: number;

  @Column({ type: 'json', nullable: true, comment: '变更前数据' })
  @ApiProperty({ description: '变更前数据', required: false })
  beforeData?: any;

  @Column({ type: 'json', nullable: true, comment: '变更后数据' })
  @ApiProperty({ description: '变更后数据', required: false })
  afterData?: any;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'IP地址' })
  @ApiProperty({ description: 'IP地址', maxLength: 50, required: false })
  ipAddress?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '用户代理' })
  @ApiProperty({ description: '用户代理', required: false })
  userAgent?: string;
}

export class QueryAuditLogDto {
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsNumber()
  entityId?: number;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  pageSize?: number = 20;
}
