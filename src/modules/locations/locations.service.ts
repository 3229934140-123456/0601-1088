import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Location,
  CreateLocationDto,
  UpdateLocationDto,
} from '../../entities/location.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction } from '../../common/enums';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
    private auditLogService: AuditLogService,
  ) {}

  async create(
    createLocationDto: CreateLocationDto,
    operatorId?: number,
  ): Promise<Location> {
    const existing = await this.locationsRepository.findOne({
      where: { name: createLocationDto.name },
    });
    if (existing) {
      throw new ConflictException('位置名称已存在');
    }

    const location = this.locationsRepository.create(createLocationDto);
    const saved = await this.locationsRepository.save(location);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `创建位置: ${location.name}`,
      entityType: 'Location',
      entityId: saved.id,
      afterData: saved,
    });

    return saved;
  }

  async findAll(params: { enabled?: boolean; parentId?: number } = {}) {
    const { enabled, parentId } = params;
    const qb = this.locationsRepository.createQueryBuilder('location');

    if (enabled !== undefined) qb.andWhere('location.enabled = :enabled', { enabled });
    if (parentId !== undefined) qb.andWhere('location.parentId = :parentId', { parentId });

    const list = await qb
      .leftJoinAndSelect('location.assets', 'assets')
      .orderBy('location.sort', 'ASC')
      .addOrderBy('location.createdAt', 'DESC')
      .getMany();

    return list;
  }

  async findTree(): Promise<any[]> {
    const locations = await this.locationsRepository.find({
      where: { enabled: true },
      order: { sort: 'ASC' },
    });
    return this.buildTree(locations as any[], null);
  }

  private buildTree(locations: any[], parentId: number | null): any[] {
    return locations
      .filter((l) => l.parentId === parentId)
      .map((l) => ({
        ...l,
        children: this.buildTree(locations, l.id),
      }));
  }

  async findOne(id: number): Promise<Location> {
    const location = await this.locationsRepository.findOne({
      where: { id },
      relations: ['assets'],
    });
    if (!location) {
      throw new NotFoundException('位置不存在');
    }
    return location;
  }

  async update(
    id: number,
    updateLocationDto: UpdateLocationDto,
    operatorId?: number,
  ): Promise<Location> {
    const location = await this.locationsRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('位置不存在');
    }

    const beforeData = { ...location };

    if (
      updateLocationDto.name &&
      updateLocationDto.name !== location.name
    ) {
      const existing = await this.locationsRepository.findOne({
        where: { name: updateLocationDto.name },
      });
      if (existing) {
        throw new ConflictException('位置名称已存在');
      }
    }

    Object.assign(location, updateLocationDto);
    const saved = await this.locationsRepository.save(location);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `更新位置: ${location.name}`,
      entityType: 'Location',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    return saved;
  }

  async remove(id: number, operatorId?: number): Promise<void> {
    const location = await this.locationsRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException('位置不存在');
    }

    const hasChildren = await this.locationsRepository.findOne({
      where: { parentId: id },
    });
    if (hasChildren) {
      throw new ConflictException('存在子位置，无法删除');
    }

    const hasAssets = await this.locationsRepository
      .createQueryBuilder('l')
      .leftJoin('l.assets', 'a')
      .where('l.id = :id', { id })
      .andWhere('a.id IS NOT NULL')
      .getOne();
    if (hasAssets) {
      throw new ConflictException('位置下存在资产，无法删除');
    }

    await this.locationsRepository.softDelete(id);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.SYSTEM_CONFIG,
      description: `删除位置: ${location.name}`,
      entityType: 'Location',
      entityId: id,
      beforeData: location,
    });
  }
}
