import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { CabinetCallbackAction } from '../common/enums';

@Entity('cabinet_callbacks')
@Index('idx_callback_id', ['callbackId'], { unique: true })
@Index('idx_borrow_record_id', ['borrowRecordId'])
@Index('idx_cabinet_code', ['cabinetCode'])
@Index('idx_created_at', ['createdAt'])
export class CabinetCallback extends BaseEntity {
  @Column({ type: 'varchar', length: 100, comment: '回调请求唯一ID（用于幂等）' })
  @ApiProperty({ description: '回调请求唯一ID' })
  callbackId: string;

  @Column({
    type: 'enum',
    enum: CabinetCallbackAction,
    comment: '回调动作',
  })
  @ApiProperty({ description: '回调动作', enum: CabinetCallbackAction })
  action: CabinetCallbackAction;

  @Column({ type: 'bigint', comment: '领用记录ID' })
  @ApiProperty({ description: '领用记录ID' })
  borrowRecordId: number;

  @Column({ type: 'varchar', length: 50, comment: '柜子编号' })
  @ApiProperty({ description: '柜子编号' })
  cabinetCode: string;

  @Column({ type: 'varchar', length: 50, comment: '格口号' })
  @ApiProperty({ description: '格口号' })
  lockerNumber: string;

  @Column({ type: 'bigint', comment: '操作人ID' })
  @ApiProperty({ description: '操作人ID' })
  operatorId: number;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '操作人姓名' })
  @ApiProperty({ description: '操作人姓名', required: false })
  operatorName?: string;

  @Column({ type: 'datetime', nullable: true, comment: '操作时间' })
  @ApiProperty({ description: '操作时间', required: false })
  operatedAt?: Date;

  @Column({ type: 'varchar', length: 20, default: 'success', comment: '回调状态: success/failed/retry' })
  @ApiProperty({ description: '回调状态' })
  status: string;

  @Column({ type: 'int', default: 0, comment: '重试次数' })
  @ApiProperty({ description: '重试次数' })
  retryCount: number;

  @Column({ type: 'text', nullable: true, comment: '失败原因' })
  @ApiProperty({ description: '失败原因', required: false })
  errorMessage?: string;

  @Column({ type: 'json', nullable: true, comment: '原始回调数据' })
  @ApiProperty({ description: '原始回调数据', required: false })
  rawData?: any;
}

export class CabinetCallbackDto {
  @IsString()
  callbackId: string;

  @IsEnum(CabinetCallbackAction)
  action: CabinetCallbackAction;

  @IsNumber()
  borrowRecordId: number;

  @IsString()
  cabinetCode: string;

  @IsString()
  lockerNumber: string;

  @IsNumber()
  operatorId: number;

  @IsOptional()
  @IsString()
  operatorName?: string;

  @IsOptional()
  operatedAt?: Date;

  @IsOptional()
  rawData?: any;
}

export class CabinetCallbackRetryDto {
  @IsNumber({}, { each: true })
  ids: number[];
}
