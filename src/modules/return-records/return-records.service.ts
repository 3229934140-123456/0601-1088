import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReturnRecord,
  CreateReturnRecordDto,
  ConfirmReturnDto,
} from '../../entities/return-record.entity';
import { BorrowRecord } from '../../entities/borrow-record.entity';
import { Asset } from '../../entities/asset.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuditAction,
  AssetStatus,
  BorrowStatus,
  ReturnStatus,
  NotificationType,
} from '../../common/enums';

@Injectable()
export class ReturnRecordsService {
  constructor(
    @InjectRepository(ReturnRecord)
    private returnRecordsRepository: Repository<ReturnRecord>,
    @InjectRepository(BorrowRecord)
    private borrowRecordsRepository: Repository<BorrowRecord>,
    @InjectRepository(Asset)
    private assetsRepository: Repository<Asset>,
    private auditLogService: AuditLogService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createReturnRecordDto: CreateReturnRecordDto,
    operatorId?: number,
  ): Promise<ReturnRecord> {
    const { borrowRecordId, returnDate, hasDamage, damageDescription, damagePhotos } =
      createReturnRecordDto;

    const borrowRecord = await this.borrowRecordsRepository.findOne({
      where: { id: borrowRecordId },
      relations: ['asset', 'borrower'],
    });
    if (!borrowRecord) {
      throw new NotFoundException('领用记录不存在');
    }

    if (
      borrowRecord.status !== BorrowStatus.BORROWED &&
      borrowRecord.status !== BorrowStatus.OVERDUE
    ) {
      throw new ConflictException('该领用记录无法归还');
    }

    const existingReturn = await this.returnRecordsRepository.findOne({
      where: { borrowRecordId },
    });
    if (existingReturn) {
      throw new ConflictException('该领用记录已提交归还');
    }

    if (returnDate < borrowRecord.borrowDate) {
      throw new BadRequestException('归还日期不能早于领用日期');
    }

    const returnRecord = this.returnRecordsRepository.create({
      ...createReturnRecordDto,
      confirmerId: operatorId,
      returnNo: `RT${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`,
      status: ReturnStatus.PENDING,
    });

    const saved = await this.returnRecordsRepository.save(returnRecord);

    await this.auditLogService.create({
      userId: operatorId,
      action: AuditAction.RETURN_SUBMIT,
      description: `提交归还: ${borrowRecord.asset?.name}`,
      entityType: 'ReturnRecord',
      entityId: saved.id,
      afterData: saved,
    });

    return this.findOne(saved.id);
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    status?: ReturnStatus;
    startDate?: Date;
    endDate?: Date;
    hasDamage?: boolean;
  }) {
    const { page = 1, pageSize = 20, status, startDate, endDate, hasDamage } = params;

    const qb = this.returnRecordsRepository
      .createQueryBuilder('returnRecord')
      .leftJoinAndSelect('returnRecord.borrowRecord', 'borrowRecord')
      .leftJoinAndSelect('borrowRecord.asset', 'asset')
      .leftJoinAndSelect('borrowRecord.borrower', 'borrower')
      .leftJoinAndSelect('returnRecord.confirmer', 'confirmer')
      .leftJoinAndSelect('returnRecord.compensationRecord', 'compensationRecord');

    if (status) qb.andWhere('returnRecord.status = :status', { status });
    if (hasDamage !== undefined) {
      qb.andWhere('returnRecord.hasDamage = :hasDamage', { hasDamage });
    }
    if (startDate) {
      qb.andWhere('returnRecord.returnDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('returnRecord.returnDate <= :endDate', { endDate });
    }

    const total = await qb.getCount();
    const list = await qb
      .orderBy('returnRecord.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return { list, total, page, pageSize };
  }

  async findOne(id: number): Promise<ReturnRecord> {
    const returnRecord = await this.returnRecordsRepository.findOne({
      where: { id },
      relations: [
        'borrowRecord',
        'borrowRecord.asset',
        'borrowRecord.borrower',
        'confirmer',
        'compensationRecord',
      ],
    });
    if (!returnRecord) {
      throw new NotFoundException('归还记录不存在');
    }
    return returnRecord;
  }

  async findByBorrowRecordId(borrowRecordId: number): Promise<ReturnRecord | null> {
    return this.returnRecordsRepository.findOne({
      where: { borrowRecordId },
      relations: [
        'borrowRecord',
        'borrowRecord.asset',
        'borrowRecord.borrower',
        'compensationRecord',
      ],
    });
  }

  async confirm(
    id: number,
    confirmDto: ConfirmReturnDto,
    operatorId?: number,
  ): Promise<ReturnRecord> {
    const returnRecord = await this.findOne(id);
    if (!returnRecord) {
      throw new NotFoundException('归还记录不存在');
    }

    if (returnRecord.status !== ReturnStatus.PENDING) {
      throw new ConflictException('该归还已处理');
    }

    const beforeData = { ...returnRecord };
    const borrowRecord = returnRecord.borrowRecord;
    const asset = borrowRecord?.asset;
    const assetId = asset?.id as number;
    const assetName = asset?.name || '';

    Object.assign(returnRecord, {
      status: confirmDto.status,
      hasDamage: confirmDto.hasDamage ?? returnRecord.hasDamage,
      damageDescription: confirmDto.damageDescription ?? returnRecord.damageDescription,
      damagePhotos: confirmDto.damagePhotos ?? returnRecord.damagePhotos,
      remark: confirmDto.remark ?? returnRecord.remark,
      confirmerId: operatorId,
    });

    if (confirmDto.status === ReturnStatus.CONFIRMED) {
      if (borrowRecord) {
        borrowRecord.status = BorrowStatus.RETURNED;
        borrowRecord.actualReturnDate = returnRecord.returnDate;
        await this.borrowRecordsRepository.save(borrowRecord);
      }

      if (asset) {
        if (returnRecord.hasDamage) {
          asset.status = AssetStatus.DAMAGED;
        } else {
          asset.status = AssetStatus.AVAILABLE;
        }
        await this.assetsRepository.save(asset);
      }

      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.RETURN_CONFIRM,
        description: `确认归还: ${assetName}`,
        entityType: 'ReturnRecord',
        entityId: id,
        beforeData,
        afterData: returnRecord,
      });

      if (returnRecord.hasDamage) {
        await this.auditLogService.create({
          userId: operatorId,
          action: AuditAction.DAMAGE_REPORT,
          description: `登记损坏: ${assetName}, ${returnRecord.damageDescription}`,
          entityType: 'Asset',
          entityId: assetId,
          afterData: { damage: returnRecord.damageDescription },
        });

        await this.notificationsService.create({
          userId: borrowRecord?.borrowerId || 0,
          type: NotificationType.COMPENSATION_REQUEST,
          title: '资产损坏提醒',
          content: `您归还的 ${assetName} 存在损坏：${returnRecord.damageDescription}，请配合处理赔偿事宜`,
          relatedData: {
            returnRecordId: id,
            assetId: assetId,
            hasDamage: true,
          },
        });
      }
    } else if (confirmDto.status === ReturnStatus.DAMAGED) {
      if (asset) {
        asset.status = AssetStatus.DAMAGED;
        await this.assetsRepository.save(asset);
      }

      await this.auditLogService.create({
        userId: operatorId,
        action: AuditAction.DAMAGE_REPORT,
        description: `登记损坏: ${assetName}, ${returnRecord.damageDescription}`,
        entityType: 'Asset',
        entityId: assetId,
        afterData: returnRecord,
      });
    }

    return this.returnRecordsRepository.save(returnRecord);
  }
}
