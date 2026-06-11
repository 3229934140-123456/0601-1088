import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  @ApiProperty({ description: '主键ID' })
  id: number;

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true, comment: '删除时间' })
  @ApiProperty({ description: '删除时间' })
  deletedAt?: Date;
}
