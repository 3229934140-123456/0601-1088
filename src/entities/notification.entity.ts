import { Entity, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';
import { NotificationType } from '../common/enums';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';

@Entity('notifications')
@Index('idx_user_id', ['userId'])
@Index('idx_type', ['type'])
@Index('idx_is_read', ['isRead'])
@Index('idx_created_at', ['createdAt'])
@Index('idx_dedup_key', ['dedupKey'], { unique: true })
export class Notification extends BaseEntity {
  @Column({ type: 'bigint', comment: '接收用户ID' })
  @ApiProperty({ description: '接收用户ID' })
  userId: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '去重键（用户+类型+关联实体+日期）' })
  @ApiProperty({ description: '去重键', required: false })
  dedupKey?: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: '通知类型',
  })
  @ApiProperty({ description: '通知类型', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200, comment: '通知标题' })
  @ApiProperty({ description: '通知标题', maxLength: 200 })
  title: string;

  @Column({ type: 'text', comment: '通知内容' })
  @ApiProperty({ description: '通知内容' })
  content: string;

  @Column({ type: 'json', nullable: true, comment: '相关数据' })
  @ApiProperty({ description: '相关数据', required: false })
  relatedData?: any;

  @Column({ type: 'boolean', default: false, comment: '是否已读' })
  @ApiProperty({ description: '是否已读', default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true, comment: '阅读时间' })
  @ApiProperty({ description: '阅读时间', required: false })
  readAt?: Date;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'userId' })
  user: User;
}

export class CreateNotificationDto {
  @IsNumber()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  relatedData?: any;

  @IsOptional()
  @IsString()
  dedupKey?: string;
}

export class QueryNotificationDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  isRead?: boolean;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  pageSize?: number = 20;
}
