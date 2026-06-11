import { Entity, Column, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { AssetCategory } from './asset-category.entity';
import { Location } from './location.entity';
import { BorrowRecord } from './borrow-record.entity';
import { AssetStatus } from '../common/enums';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  IsEnum,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

@Entity('assets')
@Index('idx_asset_code', ['assetCode'], { unique: true })
@Index('idx_category_id', ['categoryId'])
@Index('idx_location_id', ['locationId'])
@Index('idx_status', ['status'])
export class Asset extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true, comment: '资产编号' })
  @ApiProperty({ description: '资产编号', maxLength: 50 })
  assetCode: string;

  @Column({ type: 'varchar', length: 200, comment: '资产名称' })
  @ApiProperty({ description: '资产名称', maxLength: 200 })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '资产描述' })
  @ApiProperty({ description: '资产描述', required: false })
  description?: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '品牌' })
  @ApiProperty({ description: '品牌', maxLength: 200, required: false })
  brand?: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '型号' })
  @ApiProperty({ description: '型号', maxLength: 200, required: false })
  model?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '序列号' })
  @ApiProperty({ description: '序列号', maxLength: 100, required: false })
  serialNumber?: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    comment: '购置价格',
  })
  @ApiProperty({ description: '购置价格', type: 'number' })
  purchasePrice: number;

  @Column({ type: 'date', nullable: true, comment: '购置日期' })
  @ApiProperty({ description: '购置日期', required: false })
  purchaseDate?: Date;

  @Column({ type: 'bigint', comment: '类别ID' })
  @ApiProperty({ description: '类别ID' })
  categoryId: number;

  @Column({ type: 'bigint', comment: '位置ID' })
  @ApiProperty({ description: '位置ID' })
  locationId: number;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.AVAILABLE,
    comment: '资产状态',
  })
  @ApiProperty({ description: '资产状态', enum: AssetStatus, default: AssetStatus.AVAILABLE })
  status: AssetStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '图片URL' })
  @ApiProperty({ description: '图片URL', required: false })
  imageUrl?: string;

  @Column({ type: 'text', nullable: true, comment: '规格参数' })
  @ApiProperty({ description: '规格参数', required: false })
  specifications?: string;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  @ApiProperty({ description: '备注', required: false })
  remark?: string;

  @ManyToOne(() => AssetCategory, (category) => category.assets)
  @JoinColumn({ name: 'categoryId' })
  category: AssetCategory;

  @ManyToOne(() => Location, (location) => location.assets)
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @OneToMany(() => BorrowRecord, (record) => record.asset)
  borrowRecords: BorrowRecord[];

  get isAvailable(): boolean {
    return this.status === AssetStatus.AVAILABLE;
  }

  get isBorrowed(): boolean {
    return this.status === AssetStatus.BORROWED;
  }

  get isFrozen(): boolean {
    return this.status === AssetStatus.FROZEN;
  }
}

export class CreateAssetDto {
  @IsString()
  @MaxLength(50)
  assetCode: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  purchaseDate?: Date;

  @IsNumber()
  categoryId: number;

  @IsNumber()
  locationId: number;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  assetCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  purchaseDate?: Date;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  specifications?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryAssetDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  locationId?: number;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  pageSize?: number = 20;
}
