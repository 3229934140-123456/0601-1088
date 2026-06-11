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
import { Asset } from './asset.entity';
import { User } from './user.entity';
import { ReturnRecord } from './return-record.entity';
import { BorrowStatus } from '../common/enums';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsEnum,
  IsDate,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

@Entity('borrow_records')
@Index('idx_asset_id', ['assetId'])
@Index('idx_borrower_id', ['borrowerId'])
@Index('idx_status', ['status'])
@Index('idx_expected_return_date', ['expectedReturnDate'])
export class BorrowRecord extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, comment: '领用单号' })
  @ApiProperty({ description: '领用单号', maxLength: 50 })
  recordNo: string;

  @Column({ type: 'bigint', comment: '资产ID' })
  @ApiProperty({ description: '资产ID' })
  assetId: number;

  @Column({ type: 'bigint', comment: '领用人ID' })
  @ApiProperty({ description: '领用人ID' })
  borrowerId: number;

  @Column({ type: 'text', comment: '用途说明' })
  @ApiProperty({ description: '用途说明' })
  purpose: string;

  @Column({ type: 'date', comment: '领用日期' })
  @ApiProperty({ description: '领用日期' })
  borrowDate: Date;

  @Column({ type: 'date', comment: '预计归还日期' })
  @ApiProperty({ description: '预计归还日期' })
  expectedReturnDate: Date;

  @Column({ type: 'date', nullable: true, comment: '实际归还日期' })
  @ApiProperty({ description: '实际归还日期', required: false })
  actualReturnDate?: Date;

  @Column({
    type: 'enum',
    enum: BorrowStatus,
    default: BorrowStatus.PENDING,
    comment: '领用状态',
  })
  @ApiProperty({ description: '领用状态', enum: BorrowStatus, default: BorrowStatus.PENDING })
  status: BorrowStatus;

  @Column({ type: 'bigint', nullable: true, comment: '审批人ID' })
  @ApiProperty({ description: '审批人ID', required: false })
  approverId?: number;

  @Column({ type: 'datetime', nullable: true, comment: '审批时间' })
  @ApiProperty({ description: '审批时间', required: false })
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true, comment: '审批意见' })
  @ApiProperty({ description: '审批意见', required: false })
  approvalRemark?: string;

  @Column({ type: 'json', nullable: true, comment: '附件凭证列表' })
  @ApiProperty({ description: '附件凭证列表', type: [String], required: false })
  attachments?: string[];

  @Column({ type: 'text', nullable: true, comment: '备注' })
  @ApiProperty({ description: '备注', required: false })
  remark?: string;

  @ManyToOne(() => Asset, (asset) => asset.borrowRecords)
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @ManyToOne(() => User, (user) => user.borrowRecords)
  @JoinColumn({ name: 'borrowerId' })
  borrower: User;

  @OneToOne(() => ReturnRecord, (returnRecord) => returnRecord.borrowRecord)
  returnRecord: ReturnRecord;

  get isOverdue(): boolean {
    if (this.status === BorrowStatus.RETURNED) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.expectedReturnDate < today;
  }

  get daysRemaining(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(this.expectedReturnDate);
    expected.setHours(0, 0, 0, 0);
    const diff = expected.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

export class CreateBorrowRecordDto {
  @IsNumber()
  assetId: number;

  @IsOptional()
  @IsNumber()
  borrowerId?: number;

  @IsString()
  purpose: string;

  @Type(() => Date)
  @IsDate()
  borrowDate: Date;

  @Type(() => Date)
  @IsDate()
  expectedReturnDate: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}

export class ApproveBorrowDto {
  @IsEnum(BorrowStatus)
  status: BorrowStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryBorrowRecordDto {
  @IsOptional()
  @IsNumber()
  assetId?: number;

  @IsOptional()
  @IsNumber()
  borrowerId?: number;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsEnum(BorrowStatus)
  status?: BorrowStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isOverdue?: boolean;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  pageSize?: number = 20;
}
