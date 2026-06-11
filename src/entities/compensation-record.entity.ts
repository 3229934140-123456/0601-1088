import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { ReturnRecord } from './return-record.entity';
import { User } from './user.entity';
import { CompensationStatus } from '../common/enums';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

@Entity('compensation_records')
@Index('idx_return_record_id', ['returnRecordId'])
@Index('idx_handler_id', ['handlerId'])
@Index('idx_status', ['status'])
export class CompensationRecord extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, comment: '赔偿单号' })
  @ApiProperty({ description: '赔偿单号', maxLength: 50 })
  compensationNo: string;

  @Column({ type: 'bigint', unique: true, comment: '归还记录ID' })
  @ApiProperty({ description: '归还记录ID' })
  returnRecordId: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: '赔偿金额',
  })
  @ApiProperty({ description: '赔偿金额', type: 'number' })
  amount: number;

  @Column({ type: 'text', comment: '赔偿说明' })
  @ApiProperty({ description: '赔偿说明' })
  description: string;

  @Column({
    type: 'enum',
    enum: CompensationStatus,
    default: CompensationStatus.PENDING,
    comment: '赔偿状态',
  })
  @ApiProperty({
    description: '赔偿状态',
    enum: CompensationStatus,
    default: CompensationStatus.PENDING,
  })
  status: CompensationStatus;

  @Column({ type: 'bigint', comment: '处理人ID' })
  @ApiProperty({ description: '处理人ID' })
  handlerId: number;

  @Column({ type: 'date', nullable: true, comment: '赔付日期' })
  @ApiProperty({ description: '赔付日期', required: false })
  paidDate?: Date;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  @ApiProperty({ description: '备注', required: false })
  remark?: string;

  @Column({ type: 'json', nullable: true, comment: '赔偿凭证附件列表' })
  @ApiProperty({ description: '赔偿凭证附件列表', type: [String], required: false })
  attachments?: string[];

  @OneToOne(() => ReturnRecord, (returnRecord) => returnRecord.compensationRecord)
  @JoinColumn({ name: 'returnRecordId' })
  returnRecord: ReturnRecord;

  @ManyToOne(() => User, (user) => user.handledCompensations)
  @JoinColumn({ name: 'handlerId' })
  handler: User;
}

export class CreateCompensationRecordDto {
  @IsNumber()
  returnRecordId: number;

  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateCompensationRecordDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CompensationStatus)
  status?: CompensationStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidDate?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}
