import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CompensationRecord,
  CreateCompensationRecordDto,
  UpdateCompensationRecordDto,
  QueryCompensationRecordDto,
} from '../../entities/compensation-record.entity';
import { ReturnRecord } from '../../entities/return-record.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuditAction,
  CompensationStatus,
  NotificationType,
  NotificationTodoStatus,
} from '../../common/enums';

@Injectable()
export class CompensationRecordsService {
  constructor(
    @InjectRepository(CompensationRecord)
    private compensationRecordsRepository: Repository<CompensationRecord>,
    @InjectRepository(ReturnRecord)
    private returnRecordsRepository: Repository<ReturnRecord>,
    private auditLogService: AuditLogService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createCompensationRecordDto: CreateCompensationRecordDto,
    operatorId?: number,
  ): Promise<CompensationRecord> {
    const { returnRecordId, amount, description } = createCompensationRecordDto;

    const returnRecord = await this.returnRecordsRepository.findOne({
      where: { id: returnRecordId },
      relations: ['borrowRecord', 'borrowRecord.borrower', 'borrowRecord.asset'],
    });
    if (!returnRecord) {
      throw new NotFoundException('归还记录不存在');
    }

    const existingCompensation = await this.compensationRecordsRepository.findOne({
      where: { returnRecordId },
    });
    if (existingCompensation) {
      throw new ConflictException('该归还记录已创建赔偿');
    }

    if (amount <= 0) {
      throw new BadRequestException('赔偿金额必须大于0');
    }

    const compensation = this.compensationRecordsRepository.create({
      ...createCompensationRecordDto,
      handlerId: operatorId,
      compensationNo: `CP${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`,
      status: CompensationStatus.PENDING,
    });

    const saved = await this.compensationRecordsRepository.save(compensation);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.COMPENSATION_CREATE,
      description: `发起赔偿: ${returnRecord.borrowRecord?.asset?.name}, 金额 ¥${amount}`,
      entityType: 'CompensationRecord',
      entityId: saved.id,
      afterData: saved,
    });

    await this.notificationsService.create({
      userId: returnRecord.borrowRecord?.borrowerId || 0,
      type: NotificationType.COMPENSATION_REQUEST,
      title: '赔偿通知',
      content: `您需要为 ${returnRecord.borrowRecord?.asset?.name} 的损坏支付赔偿 ¥${amount}，原因：${description}`,
      relatedData: {
        compensationRecordId: saved.id,
        returnRecordId,
        assetId: returnRecord.borrowRecord?.assetId,
        amount,
      },
      relatedEntityType: 'CompensationRecord',
      relatedEntityId: saved.id,
    });

    return this.findOne(saved.id);
  }

  async findAll(query: QueryCompensationRecordDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      borrowerId,
      departmentId,
      assetId,
      handlerId,
      startDate,
      endDate,
    } = query;

    const qb = this.compensationRecordsRepository
      .createQueryBuilder('compensation')
      .leftJoinAndSelect('compensation.returnRecord', 'returnRecord')
      .leftJoinAndSelect('returnRecord.borrowRecord', 'borrowRecord')
      .leftJoinAndSelect('borrowRecord.asset', 'asset')
      .leftJoinAndSelect('borrowRecord.borrower', 'borrower')
      .leftJoinAndSelect('borrower.department', 'department')
      .leftJoinAndSelect('compensation.handler', 'handler');

    if (status) qb.andWhere('compensation.status = :status', { status });
    if (handlerId) qb.andWhere('compensation.handlerId = :handlerId', { handlerId });
    if (borrowerId) {
      qb.andWhere('borrowRecord.borrowerId = :borrowerId', { borrowerId });
    }
    if (departmentId) {
      qb.andWhere('borrower.departmentId = :departmentId', { departmentId });
    }
    if (assetId) {
      qb.andWhere('borrowRecord.assetId = :assetId', { assetId });
    }
    if (startDate) {
      qb.andWhere('compensation.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('compensation.createdAt <= :endDate', { endDate });
    }

    const total = await qb.getCount();
    const list = await qb
      .orderBy('compensation.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
  }

  async getStatistics(query: QueryCompensationRecordDto) {
    const { status, borrowerId, departmentId, assetId, startDate, endDate } = query;

    const qb = this.compensationRecordsRepository
      .createQueryBuilder('compensation')
      .leftJoin('compensation.returnRecord', 'returnRecord')
      .leftJoin('returnRecord.borrowRecord', 'borrowRecord')
      .leftJoin('borrowRecord.asset', 'asset')
      .leftJoin('borrowRecord.borrower', 'borrower')
      .leftJoin('borrower.department', 'department')
      .select('COUNT(compensation.id)', 'count')
      .addSelect('IFNULL(SUM(compensation.amount), 0)', 'totalAmount');

    if (status) qb.andWhere('compensation.status = :status', { status });
    if (borrowerId) {
      qb.andWhere('borrowRecord.borrowerId = :borrowerId', { borrowerId });
    }
    if (departmentId) {
      qb.andWhere('borrower.departmentId = :departmentId', { departmentId });
    }
    if (assetId) {
      qb.andWhere('borrowRecord.assetId = :assetId', { assetId });
    }
    if (startDate) {
      qb.andWhere('compensation.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('compensation.createdAt <= :endDate', { endDate });
    }

    const result = await qb.getRawOne();

    return {
      count: parseInt(result.count || '0', 10),
      totalAmount: parseFloat(result.totalAmount || '0'),
    };
  }

  async findOne(id: number): Promise<CompensationRecord> {
    const compensation = await this.compensationRecordsRepository.findOne({
      where: { id },
      relations: [
        'returnRecord',
        'returnRecord.borrowRecord',
        'returnRecord.borrowRecord.asset',
        'returnRecord.borrowRecord.asset.category',
        'returnRecord.borrowRecord.asset.location',
        'returnRecord.borrowRecord.borrower',
        'returnRecord.borrowRecord.borrower.department',
        'handler',
      ],
    });
    if (!compensation) {
      throw new NotFoundException('赔偿记录不存在');
    }
    return compensation;
  }

  async findByReturnRecordId(returnRecordId: number): Promise<CompensationRecord | null> {
    return this.compensationRecordsRepository.findOne({
      where: { returnRecordId },
      relations: [
        'returnRecord',
        'returnRecord.borrowRecord',
        'returnRecord.borrowRecord.asset',
        'handler',
      ],
    });
  }

  async update(
    id: number,
    updateDto: UpdateCompensationRecordDto,
    operatorId?: number,
  ): Promise<CompensationRecord> {
    const compensation = await this.findOne(id);
    if (!compensation) {
      throw new NotFoundException('赔偿记录不存在');
    }

    if (compensation.status === CompensationStatus.PAID) {
      throw new ConflictException('已支付的赔偿不能修改');
    }

    const beforeData = { ...compensation };

    if (updateDto.amount !== undefined && updateDto.amount <= 0) {
      throw new BadRequestException('赔偿金额必须大于0');
    }

    Object.assign(compensation, updateDto, { handlerId: operatorId });

    if (updateDto.status === CompensationStatus.PAID && !compensation.paidDate) {
      compensation.paidDate = new Date();
    }

    const saved = await this.compensationRecordsRepository.save(compensation);

    if (updateDto.status === CompensationStatus.PAID) {
      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.COMPENSATION_PAY,
        description: `确认赔偿已支付: ${saved.compensationNo}, 金额 ¥${saved.amount}`,
        entityType: 'CompensationRecord',
        entityId: id,
        beforeData,
        afterData: saved,
      });

      const borrowerId = compensation.returnRecord?.borrowRecord?.borrowerId || 0;
      if (borrowerId) {
        await this.notificationsService.create({
          userId: borrowerId,
          type: NotificationType.SYSTEM_NOTICE,
          title: '赔偿已支付',
          content: `您的赔偿 ${saved.compensationNo}（¥${saved.amount}）已确认支付`,
          relatedData: {
            compensationRecordId: id,
            status: CompensationStatus.PAID,
            amount: saved.amount,
            attachments: saved.attachments,
          },
          relatedEntityType: 'CompensationRecord',
          relatedEntityId: id,
        });

        await this.notificationsService.resolveTodoByEntity('CompensationRecord', id);
      }
    } else {
      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.SYSTEM_CONFIG,
        description: `更新赔偿记录: ${saved.compensationNo}`,
        entityType: 'CompensationRecord',
        entityId: id,
        beforeData,
        afterData: saved,
      });
    }

    return saved;
  }

  async waive(id: number, operatorId?: number): Promise<CompensationRecord> {
    const compensation = await this.findOne(id);
    if (!compensation) {
      throw new NotFoundException('赔偿记录不存在');
    }

    if (compensation.status === CompensationStatus.PAID) {
      throw new ConflictException('已支付的赔偿不能免除');
    }

    const beforeData = { ...compensation };
    compensation.status = CompensationStatus.WAIVED;

    const saved = await this.compensationRecordsRepository.save(compensation);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.COMPENSATION_WAIVE,
      description: `免除赔偿: ${saved.compensationNo}`,
      entityType: 'CompensationRecord',
      entityId: id,
      beforeData,
      afterData: saved,
    });

    await this.notificationsService.create({
      userId: compensation.returnRecord?.borrowRecord?.borrowerId || 0,
      type: NotificationType.SYSTEM_NOTICE,
      title: '赔偿已免除',
      content: `您的赔偿 ${saved.compensationNo}（¥${saved.amount}）已被免除`,
      relatedData: {
        compensationRecordId: id,
        status: CompensationStatus.WAIVED,
        amount: saved.amount,
      },
      relatedEntityType: 'CompensationRecord',
      relatedEntityId: id,
    });

    await this.notificationsService.resolveTodoByEntity('CompensationRecord', id);

    return saved;
  }
}
