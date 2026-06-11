import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Asset,
  CreateAssetDto,
  UpdateAssetDto,
  QueryAssetDto,
} from '../../entities/asset.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction, AssetStatus, BorrowStatus } from '../../common/enums';
import { BorrowRecord } from '../../entities/borrow-record.entity';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private assetsRepository: Repository<Asset>,
    @InjectRepository(BorrowRecord)
    private borrowRecordsRepository: Repository<BorrowRecord>,
    private auditLogService: AuditLogService,
  ) {}

  async create(createAssetDto: CreateAssetDto, operatorId?: number): Promise<Asset> {
    const existing = await this.assetsRepository.findOne({
      where: { assetCode: createAssetDto.assetCode },
    });
    if (existing) {
      throw new ConflictException('资产编号已存在');
    }

    const asset = this.assetsRepository.create(createAssetDto);
    const saved = await this.assetsRepository.save(asset);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.ASSET_CREATE,
      description: `创建资产: ${asset.name} (${asset.assetCode})`,
      entityType: 'Asset',
      entityId: saved.id,
      afterData: saved,
    });

    return this.findOne(saved.id);
  }

  async findAll(query: QueryAssetDto) {
    const { page = 1, pageSize = 20, keyword, categoryId, locationId, status } = query;

    const qb = this.assetsRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.location', 'location');

    if (keyword) {
      qb.andWhere(
        '(asset.name LIKE :keyword OR asset.assetCode LIKE :keyword OR asset.brand LIKE :keyword OR asset.model LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    if (categoryId) qb.andWhere('asset.categoryId = :categoryId', { categoryId });
    if (locationId) qb.andWhere('asset.locationId = :locationId', { locationId });
    if (status) qb.andWhere('asset.status = :status', { status });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('asset.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
  }

  async findAvailable(params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    categoryId?: number;
    locationId?: number;
  }) {
    const { page = 1, pageSize = 20, keyword, categoryId, locationId } = params;

    const qb = this.assetsRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.location', 'location')
      .where('asset.status = :status', { status: AssetStatus.AVAILABLE });

    if (keyword) {
      qb.andWhere(
        '(asset.name LIKE :keyword OR asset.assetCode LIKE :keyword OR asset.brand LIKE :keyword OR asset.model LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }
    if (categoryId) qb.andWhere('asset.categoryId = :categoryId', { categoryId });
    if (locationId) qb.andWhere('asset.locationId = :locationId', { locationId });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('asset.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
  }

  async findOne(id: number): Promise<Asset> {
    const asset = await this.assetsRepository.findOne({
      where: { id },
      relations: ['category', 'location', 'borrowRecords'],
    });
    if (!asset) {
      throw new NotFoundException('资产不存在');
    }
    return asset;
  }

  async findByAssetCode(assetCode: string): Promise<Asset> {
    const asset = await this.assetsRepository.findOne({
      where: { assetCode },
      relations: ['category', 'location'],
    });
    if (!asset) {
      throw new NotFoundException('资产不存在');
    }
    return asset;
  }

  async update(
    id: number,
    updateAssetDto: UpdateAssetDto,
    operatorId?: number,
  ): Promise<Asset> {
    const asset = await this.assetsRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('资产不存在');
    }

    const beforeData = { ...asset };

    if (
      updateAssetDto.assetCode &&
      updateAssetDto.assetCode !== asset.assetCode
    ) {
      const existing = await this.assetsRepository.findOne({
        where: { assetCode: updateAssetDto.assetCode },
      });
      if (existing) {
        throw new ConflictException('资产编号已存在');
      }
    }

    Object.assign(asset, updateAssetDto);
    const saved = await this.assetsRepository.save(asset);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.ASSET_UPDATE,
      description: `更新资产: ${asset.name} (${asset.assetCode})`,
      entityType: 'Asset',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    return this.findOne(id);
  }

  async remove(id: number, operatorId?: number): Promise<void> {
    const asset = await this.assetsRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('资产不存在');
    }

    if (asset.status === AssetStatus.BORROWED) {
      throw new ConflictException('资产已借出，无法删除');
    }

    await this.assetsRepository.softDelete(id);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.ASSET_DELETE,
      description: `删除资产: ${asset.name} (${asset.assetCode})`,
      entityType: 'Asset',
      entityId: id,
      beforeData: asset,
    });
  }

  async freeze(id: number, operatorId?: number): Promise<Asset> {
    const asset = await this.assetsRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('资产不存在');
    }

    if (asset.status === AssetStatus.BORROWED) {
      throw new ConflictException('资产已借出，无法冻结');
    }

    if (asset.status === AssetStatus.FROZEN) {
      return asset;
    }

    const beforeData = { ...asset };
    asset.status = AssetStatus.FROZEN;
    const saved = await this.assetsRepository.save(asset);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.ASSET_FREEZE,
      description: `冻结资产: ${asset.name} (${asset.assetCode})`,
      entityType: 'Asset',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    return saved;
  }

  async unfreeze(id: number, operatorId?: number): Promise<Asset> {
    const asset = await this.assetsRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException('资产不存在');
    }

    if (asset.status !== AssetStatus.FROZEN) {
      return asset;
    }

    const beforeData = { ...asset };
    asset.status = AssetStatus.AVAILABLE;
    const saved = await this.assetsRepository.save(asset);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.ASSET_UNFREEZE,
      description: `解冻资产: ${asset.name} (${asset.assetCode})`,
      entityType: 'Asset',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    return saved;
  }

  async findBorrowedByUser(userId: number) {
    const records = await this.borrowRecordsRepository.find({
      where: {
        borrowerId: userId,
        status: In([BorrowStatus.BORROWED, BorrowStatus.OVERDUE]),
      },
      relations: ['asset', 'asset.category', 'asset.location'],
      order: { borrowDate: 'DESC' },
    });

    return records.map((record) => ({
      ...record.asset,
      borrowRecord: {
        id: record.id,
        recordNo: record.recordNo,
        purpose: record.purpose,
        borrowDate: record.borrowDate,
        expectedReturnDate: record.expectedReturnDate,
        status: record.status,
        isOverdue: record.isOverdue,
        daysRemaining: record.daysRemaining,
      },
    }));
  }

  async getStats() {
    const [total, available, borrowed, frozen, damaged] = await Promise.all([
      this.assetsRepository.count(),
      this.assetsRepository.count({ where: { status: AssetStatus.AVAILABLE } }),
      this.assetsRepository.count({ where: { status: AssetStatus.BORROWED } }),
      this.assetsRepository.count({ where: { status: AssetStatus.FROZEN } }),
      this.assetsRepository.count({ where: { status: AssetStatus.DAMAGED } }),
    ]);

    const totalValue = await this.assetsRepository
      .createQueryBuilder('asset')
      .select('SUM(asset.purchasePrice)', 'total')
      .getRawOne();

    return {
      total,
      available,
      borrowed,
      frozen,
      damaged,
      totalValue: Number(totalValue.total) || 0,
    };
  }
}
