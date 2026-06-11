import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssetCategory,
  CreateAssetCategoryDto,
  UpdateAssetCategoryDto,
} from '../../entities/asset-category.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction } from '../../common/enums';

@Injectable()
export class AssetCategoriesService {
  constructor(
    @InjectRepository(AssetCategory)
    private categoriesRepository: Repository<AssetCategory>,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    createCategoryDto: CreateAssetCategoryDto,
    operatorId?: number,
  ): Promise<AssetCategory> {
    const existing = await this.categoriesRepository.findOne({
      where: { name: createCategoryDto.name },
    });
    if (existing) {
      throw new ConflictException('类别名称已存在');
    }

    const category = this.categoriesRepository.create(createCategoryDto);
    const saved = await this.categoriesRepository.save(category);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `创建资产类别: ${category.name}`,
      entityType: 'AssetCategory',
      entityId: saved.id,
      afterData: saved,
    });

    return saved;
  }

  async findAll(params: { enabled?: boolean; parentId?: number } = {}) {
    const { enabled, parentId } = params;
    const qb = this.categoriesRepository.createQueryBuilder('category');

    if (enabled !== undefined) qb.andWhere('category.enabled = :enabled', { enabled });
    if (parentId !== undefined) qb.andWhere('category.parentId = :parentId', { parentId });

    const list = await qb
      .leftJoinAndSelect('category.assets', 'assets')
      .orderBy('category.sort', 'ASC')
      .addOrderBy('category.createdAt', 'DESC')
      .getMany();

    return list;
  }

  async findTree(): Promise<any[]> {
    const categories = await this.categoriesRepository.find({
      where: { enabled: true },
      order: { sort: 'ASC' },
    });
    return this.buildTree(categories as any[], null);
  }

  private buildTree(categories: any[], parentId: number | null): any[] {
    return categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({
        ...c,
        children: this.buildTree(categories, c.id),
      }));
  }

  async findOne(id: number): Promise<AssetCategory> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['assets'],
    });
    if (!category) {
      throw new NotFoundException('资产类别不存在');
    }
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateAssetCategoryDto,
    operatorId?: number,
  ): Promise<AssetCategory> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('资产类别不存在');
    }

    const beforeData = { ...category };

    if (
      updateCategoryDto.name &&
      updateCategoryDto.name !== category.name
    ) {
      const existing = await this.categoriesRepository.findOne({
        where: { name: updateCategoryDto.name },
      });
      if (existing) {
        throw new ConflictException('类别名称已存在');
      }
    }

    Object.assign(category, updateCategoryDto);
    const saved = await this.categoriesRepository.save(category);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `更新资产类别: ${category.name}`,
      entityType: 'AssetCategory',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    return saved;
  }

  async remove(id: number, operatorId?: number): Promise<void> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('资产类别不存在');
    }

    const hasChildren = await this.categoriesRepository.findOne({
      where: { parentId: id },
    });
    if (hasChildren) {
      throw new ConflictException('存在子类别，无法删除');
    }

    const hasAssets = await this.categoriesRepository
      .createQueryBuilder('c')
      .leftJoin('c.assets', 'a')
      .where('c.id = :id', { id })
      .andWhere('a.id IS NOT NULL')
      .getOne();
    if (hasAssets) {
      throw new ConflictException('类别下存在资产，无法删除');
    }

    await this.categoriesRepository.softDelete(id);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `删除资产类别: ${category.name}`,
      entityType: 'AssetCategory',
      entityId: id,
      beforeData: category,
    });
  }
}
