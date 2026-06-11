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
import { BorrowRecord } from './borrow-record.entity';
import { User } from './user.entity';
import { CompensationRecord } from './compensation-record.entity';
import { ReturnStatus } from '../common/enums';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

@Entity('return_records')
@Index('idx_borrow_record_id', ['borrowRecordId'], { unique: true })
@Index('idx_confirmer_id', ['confirmerId'])
@Index('idx_status', ['status'])
export class ReturnRecord extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, comment: '归还单号' })
  @ApiProperty({ description: '归还单号', maxLength: 50 })
  returnNo: string;

  @Column({ type: 'bigint', unique: true, comment: '领用记录ID' })
  @ApiProperty({ description: '领用记录ID' })
  borrowRecordId: number;

  @Column({ type: 'bigint', comment: '确认人ID' })
  @ApiProperty({ description: '确认人ID' })
  confirmerId: number;

  @Column({ type: 'date', comment: '归还日期' })
  @ApiProperty({ description: '归还日期' })
  returnDate: Date;

  @Column({
    type: 'enum',
    enum: ReturnStatus,
    default: ReturnStatus.PENDING,
    comment: '归还状态',
  })
  @ApiProperty({ description: '归还状态', enum: ReturnStatus, default: ReturnStatus.PENDING })
  status: ReturnStatus;

  @Column({ type: 'boolean', default: false, comment: '是否损坏' })
  @ApiProperty({ description: '是否损坏', default: false })
  hasDamage: boolean;

  @Column({ type: 'text', nullable: true, comment: '损坏描述' })
  @ApiProperty({ description: '损坏描述', required: false })
  damageDescription?: string;

  @Column({ type: 'json', nullable: true, comment: '损坏照片' })
  @ApiProperty({ description: '损坏照片', type: [String], required: false })
  damagePhotos?: string[];

  @Column({ type: 'text', nullable: true, comment: '备注' })
  @ApiProperty({ description: '备注', required: false })
  remark?: string;

  @OneToOne(() => BorrowRecord, (borrowRecord) => borrowRecord.returnRecord)
  @JoinColumn({ name: 'borrowRecordId' })
  borrowRecord: BorrowRecord;

  @ManyToOne(() => User, (user) => user.confirmedReturns)
  @JoinColumn({ name: 'confirmerId' })
  confirmer: User;

  @OneToOne(() => CompensationRecord, (compensation) => compensation.returnRecord)
  compensationRecord: CompensationRecord;
}

export class CreateReturnRecordDto {
  @IsNumber()
  borrowRecordId: number;

  @Type(() => Date)
  @IsDate()
  returnDate: Date;

  @IsOptional()
  hasDamage?: boolean;

  @IsOptional()
  @IsString()
  damageDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  damagePhotos?: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ConfirmReturnDto {
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @IsOptional()
  hasDamage?: boolean;

  @IsOptional()
  @IsString()
  damageDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  damagePhotos?: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}
