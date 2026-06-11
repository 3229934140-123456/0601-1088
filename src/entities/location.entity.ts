import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../common/entities/base.entity';
import { Asset } from './asset.entity';
import { IsString, IsOptional, MaxLength } from 'class-validator';

@Entity('locations')
@Index('idx_name', ['name'], { unique: true })
export class Location extends BaseEntity {
  @Column({ type: 'varchar', length: 100, comment: '位置名称' })
  @ApiProperty({ description: '位置名称', maxLength: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '位置编码' })
  @ApiProperty({ description: '位置编码', maxLength: 50, required: false })
  code?: string;

  @Column({ type: 'text', nullable: true, comment: '位置描述' })
  @ApiProperty({ description: '位置描述', required: false })
  description?: string;

  @Column({ type: 'bigint', nullable: true, comment: '父位置ID' })
  @ApiProperty({ description: '父位置ID', required: false })
  parentId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '具体地址' })
  @ApiProperty({ description: '具体地址', required: false })
  address?: string;

  @Column({ type: 'int', default: 1, comment: '排序' })
  @ApiProperty({ description: '排序', default: 1 })
  sort: number;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  @ApiProperty({ description: '是否启用', default: true })
  enabled: boolean;

  @OneToMany(() => Asset, (asset) => asset.location)
  assets: Asset[];
}

export class CreateLocationDto {
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
  @IsString()
  address?: string;

  @IsOptional()
  sort?: number;
}

export class UpdateLocationDto {
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
  @IsString()
  address?: string;

  @IsOptional()
  sort?: number;

  @IsOptional()
  enabled?: boolean;
}
