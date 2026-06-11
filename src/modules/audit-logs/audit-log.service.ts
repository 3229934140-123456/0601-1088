import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, QueryAuditLogDto } from '../../entities/audit-log.entity';
import { AuditAction } from '../../common/enums';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(params: {
    userId?: number;
    username?: string;
    action: AuditAction;
    description: string;
    entityType?: string;
    entityId?: number;
    beforeData?: any;
    afterData?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const log = this.auditLogRepository.create(params);
    return this.auditLogRepository.save(log);
  }

  async findAll(query: QueryAuditLogDto) {
    const { page = 1, pageSize = 20, action, userId, entityType, entityId, startDate, endDate } =
      query;

    const qb = this.auditLogRepository.createQueryBuilder('auditLog');

    if (action) qb.andWhere('auditLog.action = :action', { action });
    if (userId) qb.andWhere('auditLog.userId = :userId', { userId });
    if (entityType) qb.andWhere('auditLog.entityType = :entityType', { entityType });
    if (entityId) qb.andWhere('auditLog.entityId = :entityId', { entityId });
    if (startDate) qb.andWhere('auditLog.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('auditLog.createdAt <= :endDate', { endDate });

    const total = await qb.getCount();
    const list = await qb
      .orderBy('auditLog.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
  }

  async findOne(id: number): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }
}
