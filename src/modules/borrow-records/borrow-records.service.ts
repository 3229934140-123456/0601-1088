import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  BorrowRecord,
  CreateBorrowRecordDto,
  ApproveBorrowDto,
  QueryBorrowRecordDto,
  BatchApproveBorrowDto,
} from '../../entities/borrow-record.entity';
import { Asset } from '../../entities/asset.entity';
import { User } from '../../entities/user.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuditAction,
  AssetStatus,
  BorrowStatus,
  NotificationType,
} from '../../common/enums';

@Injectable()
export class BorrowRecordsService {
  constructor(
    @InjectRepository(BorrowRecord)
    private borrowRecordsRepository: Repository<BorrowRecord>,
    @InjectRepository(Asset)
    private assetsRepository: Repository<Asset>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditLogService: AuditLogService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createBorrowRecordDto: CreateBorrowRecordDto,
    operatorId?: number,
  ): Promise<BorrowRecord> {
    const { assetId, borrowerId, purpose, borrowDate, expectedReturnDate } = createBorrowRecordDto;

    const actualBorrowerId = borrowerId || operatorId;
    if (!actualBorrowerId) {
      throw new BadRequestException('请指定领用人');
    }

    const asset = await this.assetsRepository.findOne({ where: { id: assetId } });
    if (!asset) {
      throw new NotFoundException('资产不存在');
    }

    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new ConflictException('资产不可领用');
    }

    if (borrowDate > expectedReturnDate) {
      throw new BadRequestException('领用日期不能晚于预计归还日期');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expected = new Date(expectedReturnDate);
    expected.setHours(0, 0, 0, 0);
    if (expected < today) {
      throw new BadRequestException('预计归还日期不能早于今天');
    }

    const existingBorrow = await this.borrowRecordsRepository.findOne({
      where: {
        assetId,
        status: In([BorrowStatus.PENDING, BorrowStatus.BORROWED, BorrowStatus.OVERDUE]),
      },
    });
    if (existingBorrow) {
      throw new ConflictException('该资产已被领用或待审批');
    }

    const borrower = await this.usersRepository.findOne({
      where: { id: actualBorrowerId, enabled: true },
    });
    if (!borrower) {
      throw new NotFoundException('领用人不存在或已禁用');
    }

    const record = this.borrowRecordsRepository.create({
      ...createBorrowRecordDto,
      borrowerId: actualBorrowerId,
      recordNo: `BR${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`,
      status: BorrowStatus.PENDING,
    });

    const saved = await this.borrowRecordsRepository.save(record);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.BORROW_REQUEST,
      description: `提交领用申请: ${asset.name} (${asset.assetCode})`,
      entityType: 'BorrowRecord',
      entityId: saved.id,
      afterData: saved,
    });

    await this.notificationsService.create({
      userId: actualBorrowerId,
      type: NotificationType.SYSTEM_NOTICE,
      title: '领用申请已提交',
      content: `您的 ${asset.name} 领用申请已提交，等待审批`,
      relatedData: { borrowRecordId: saved.id, assetId },
    });

    return this.findOne(saved.id);
  }

  async findAll(query: QueryBorrowRecordDto, currentUser?: any) {
    const {
      page = 1,
      pageSize = 20,
      assetId,
      borrowerId,
      departmentId,
      categoryId,
      locationId,
      status,
      startDate,
      endDate,
      isOverdue,
    } = query;

    const qb = this.borrowRecordsRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.asset', 'asset')
      .leftJoinAndSelect('record.borrower', 'borrower')
      .leftJoinAndSelect('borrower.department', 'department')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.location', 'location');

    if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin') {
      qb.andWhere('record.borrowerId = :currentUserId', {
        currentUserId: currentUser?.id,
      });
    }

    if (assetId) qb.andWhere('record.assetId = :assetId', { assetId });
    if (borrowerId) qb.andWhere('record.borrowerId = :borrowerId', { borrowerId });
    if (departmentId) {
      qb.andWhere('borrower.departmentId = :departmentId', { departmentId });
    }
    if (categoryId) {
      qb.andWhere('asset.categoryId = :categoryId', { categoryId });
    }
    if (locationId) {
      qb.andWhere('asset.locationId = :locationId', { locationId });
    }
    if (status) qb.andWhere('record.status = :status', { status });
    if (startDate) {
      qb.andWhere('record.borrowDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('record.borrowDate <= :endDate', { endDate });
    }

    const [list, total] = await qb
      .orderBy('record.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const resultList = list.map((record) => ({
      ...record,
      isOverdue: record.isOverdue,
      daysRemaining: record.daysRemaining,
      overdueDays: record.overdueDays,
    }));

    if (isOverdue !== undefined) {
      const filtered = resultList.filter((r) => r.isOverdue === isOverdue);
      return { list: filtered, total: filtered.length, page, pageSize };
    }

    return { list: resultList, total, page, pageSize };
  }

  async findOne(id: number): Promise<BorrowRecord> {
    const record = await this.borrowRecordsRepository.findOne({
      where: { id },
      relations: [
        'asset',
        'asset.category',
        'asset.location',
        'borrower',
        'borrower.department',
        'returnRecord',
      ],
    });
    if (!record) {
      throw new NotFoundException('领用记录不存在');
    }
    return {
      ...record,
      isOverdue: record.isOverdue,
      daysRemaining: record.daysRemaining,
      overdueDays: record.overdueDays,
    } as BorrowRecord;
  }

  async approve(
    id: number,
    approveDto: ApproveBorrowDto,
    operatorId?: number,
  ): Promise<BorrowRecord> {
    const record = await this.findOne(id);
    if (!record) {
      throw new NotFoundException('领用记录不存在');
    }

    if (record.status !== BorrowStatus.PENDING) {
      throw new ConflictException('该申请已处理');
    }

    const beforeData = { ...record };

    if (approveDto.status === BorrowStatus.APPROVED) {
      record.status = BorrowStatus.BORROWED;
      record.approverId = operatorId;
      record.approvedAt = new Date();
      record.approvalRemark = approveDto.remark;

      const asset = await this.assetsRepository.findOne({ where: { id: record.assetId } });
      if (asset) {
        asset.status = AssetStatus.BORROWED;
        await this.assetsRepository.save(asset);
      }

      await this.notificationsService.create({
        userId: record.borrowerId,
        type: NotificationType.BORROW_APPROVED,
        title: '领用申请已通过',
        content: `您的 ${record.asset?.name} 领用申请已通过审批，请及时领取`,
        relatedData: { borrowRecordId: id, assetId: record.assetId },
      });

      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.BORROW_APPROVE,
        description: `审批通过领用: ${record.asset?.name}`,
        entityType: 'BorrowRecord',
        entityId: id,
        beforeData,
        afterData: record,
      });
    } else if (approveDto.status === BorrowStatus.REJECTED) {
      record.status = BorrowStatus.REJECTED;
      record.approverId = operatorId;
      record.approvedAt = new Date();
      record.approvalRemark = approveDto.remark;

      await this.notificationsService.create({
        userId: record.borrowerId,
        type: NotificationType.BORROW_REJECTED,
        title: '领用申请被拒绝',
        content: `您的 ${record.asset?.name} 领用申请被拒绝，原因：${approveDto.remark || '未说明'}`,
        relatedData: { borrowRecordId: id, assetId: record.assetId },
      });

      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.BORROW_REJECT,
        description: `拒绝领用申请: ${record.asset?.name}`,
        entityType: 'BorrowRecord',
        entityId: id,
        beforeData,
        afterData: record,
      });
    } else {
      throw new BadRequestException('无效的审批状态');
    }

    return this.borrowRecordsRepository.save(record);
  }

  async cancel(id: number, operatorId?: number): Promise<BorrowRecord> {
    const record = await this.findOne(id);
    if (!record) {
      throw new NotFoundException('领用记录不存在');
    }

    if (record.status !== BorrowStatus.PENDING) {
      throw new ConflictException('只能撤销待审批的申请');
    }

    if (record.borrowerId !== operatorId) {
      throw new BadRequestException('只能撤销自己的申请');
    }

    const beforeData = { ...record };
    record.status = BorrowStatus.REJECTED;
    record.approvalRemark = '用户主动撤销';

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.BORROW_REJECT,
      description: `撤销领用申请: ${record.asset?.name}`,
      entityType: 'BorrowRecord',
      entityId: id,
      beforeData,
      afterData: record,
    });

    return this.borrowRecordsRepository.save(record);
  }

  async getOverdueRecords() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await this.borrowRecordsRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.asset', 'asset')
      .leftJoinAndSelect('record.borrower', 'borrower')
      .where('record.status IN (:...statuses)', {
        statuses: [BorrowStatus.BORROWED, BorrowStatus.OVERDUE],
      })
      .andWhere('record.expectedReturnDate < :today', { today })
      .getMany();

    return records.map((r) => ({ ...r, isOverdue: true }));
  }

  async getExpiringRecords(days: number = 3) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    const records = await this.borrowRecordsRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.asset', 'asset')
      .leftJoinAndSelect('record.borrower', 'borrower')
      .where('record.status IN (:...statuses)', {
        statuses: [BorrowStatus.BORROWED],
      })
      .andWhere('record.expectedReturnDate >= :today', { today })
      .andWhere('record.expectedReturnDate <= :endDate', { endDate })
      .getMany();

    return records;
  }

  async markAsOverdue(id: number): Promise<void> {
    const record = await this.borrowRecordsRepository.findOne({ where: { id } });
    if (record && record.status === BorrowStatus.BORROWED) {
      record.status = BorrowStatus.OVERDUE;
      await this.borrowRecordsRepository.save(record);
    }
  }

  async batchApprove(
    batchDto: BatchApproveBorrowDto,
    operatorId?: number,
  ): Promise<{ success: number[]; failed: { id: number; reason: string }[] }> {
    const { ids, status, remark } = batchDto;
    const success: number[] = [];
    const failed: { id: number; reason: string }[] = [];

    for (const id of ids) {
      try {
        await this.approve(id, { status, remark }, operatorId);
        success.push(id);
      } catch (error: any) {
        failed.push({ id, reason: error.message || '审批失败' });
      }
    }

    return { success, failed };
  }
}
