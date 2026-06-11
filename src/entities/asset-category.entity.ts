import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { Asset } from './asset.entity';
import { IsString, IsOptional, MaxLength } from 'class-validator';

@Entity('asset_categories')
@Index('idx_name', ['name'], { unique: true })
export class AssetCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 100, comment: '类别名称' })
  @ApiProperty({ description: '类别名称', maxLength: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '类别编码' })
  @ApiProperty({ description: '类别编码', maxLength: 50, required: false })
  code?: string;

  @Column({ type: 'text', nullable: true, comment: '类别描述' })
  @ApiProperty({ description: '类别描述', required: false })
  description?: string;

  @Column({ type: 'bigint', nullable: true, comment: '父类别ID' })
  @ApiProperty({ description: '父类别ID', required: false })
  parentId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '图标URL' })
  @ApiProperty({ description: '图标URL', required: false })
  icon?: string;

  @Column({ type: 'int', default: 1, comment: '排序' })
  @ApiProperty({ description: '排序', default: 1 })
  sort: number;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  @ApiProperty({ description: '是否启用', default: true })
  enabled: boolean;

  @OneToMany(() => Asset, (asset) => asset.category)
  assets: Asset[];
}

export class CreateAssetCategoryDto {
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

export class UpdateAssetCategoryDto {
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
